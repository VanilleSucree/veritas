import express from 'express';
import { pool } from '../../../database/db.js';
import verifyJWT from '../../../middleware/auth.js';
import { runEquipmentMonitoringSync } from './equipmentMonitoringSync.js';
const router = express.Router();

/** Canonical sources (one row per DB table) — used when listing mappings. */
const EQUIPMENT_MAPPING_SOURCES = [
  { type: 'Serveurs', table: 'v_b_clients_m_servers', family: 'servers' },
  { type: 'Stockage', table: 'v_b_clients_m_stockage', family: 'stockage' },
  { type: 'Firewalls', table: 'v_b_clients_m_firewall', family: 'firewall' },
  { type: 'Switch', table: 'v_b_clients_m_switch', family: 'switch' },
  { type: 'BorneWifi', table: 'v_b_clients_m_wifi', family: 'wifi' },
  { type: 'Alimentation', table: 'v_b_clients_m_alimentation', family: 'alimentation' },
  { type: 'Routeur', table: 'v_b_clients_m_routeur', family: 'routeur' },
  { type: 'TOIP', table: 'v_b_clients_m_toip', family: 'toip' },
  { type: 'Sauvegarde', table: 'v_b_clients_m_save', family: 'sauvegarde' },
  { type: 'Internet', table: 'v_b_clients_m_internet', family: 'internet' }
];

const TYPE_ALIASES = {
  Servers: 'Serveurs',
  Server: 'Serveurs',
  NAS: 'Stockage',
  Storage: 'Stockage',
  Firewall: 'Firewalls'
};

const TYPE_TO_TABLE = Object.fromEntries(EQUIPMENT_MAPPING_SOURCES.map(src => [src.type, src.table]));
const TYPE_TO_FAMILY = Object.fromEntries(EQUIPMENT_MAPPING_SOURCES.map(src => [src.type, src.family]));
for (const [alias, canonical] of Object.entries(TYPE_ALIASES)) {
  if (TYPE_TO_TABLE[canonical]) TYPE_TO_TABLE[alias] = TYPE_TO_TABLE[canonical];
  if (TYPE_TO_FAMILY[canonical]) TYPE_TO_FAMILY[alias] = TYPE_TO_FAMILY[canonical];
}

/** Families that can sync live CheckMK monitoring into supervision. */
const SYNCABLE_FAMILIES = new Set([
  'servers',
  'stockage',
  'firewall',
  'switch',
  'wifi',
  'alimentation',
  'routeur',
  'toip'
]);

function mappingFromEquipmentRow(row, equipmentType, clientId) {
  return {
    id: row.id,
    client_id: clientId,
    equipment_type: equipmentType,
    equipment_id: row.id,
    equipment_name: row.name || row.item_key || null,
    checkmk_host_name: row.checkmk_host_name || null,
    checkmk_site: row.checkmk_site || null,
    checkmk_service_name: row.checkmk_service_name || null,
    is_active: row.is_active !== false
  };
}

async function loadEquipmentMappings(clientId) {
  const mappings = [];
  for (const src of EQUIPMENT_MAPPING_SOURCES) {
    try {
      const result = await pool.query(
        `SELECT id, name, item_key, is_active, checkmk_host_name, checkmk_site, checkmk_service_name,
                data::jsonb->>'checkmk_host_name' AS data_host,
                data::jsonb->>'checkmk_site' AS data_site,
                data::jsonb->>'checkmk_service_name' AS data_service,
                data::jsonb->'checkmkMapping'->>'checkmk_host_name' AS mapping_host,
                data::jsonb->'checkmkMapping'->>'checkmk_site' AS mapping_site,
                data::jsonb->'checkmkMapping'->>'checkmk_service_name' AS mapping_service
           FROM ${src.table}
          WHERE client_id::text = $1`,
        [clientId]
      );
      for (const row of result.rows) {
        const host = String(row.checkmk_host_name || row.data_host || row.mapping_host || '').trim();
        if (!host) continue;
        mappings.push(mappingFromEquipmentRow({
          ...row,
          checkmk_host_name: host,
          checkmk_site: row.checkmk_site || row.data_site || row.mapping_site || null,
          checkmk_service_name: row.checkmk_service_name || row.data_service || row.mapping_service || null
        }, src.type, clientId));
      }
    } catch (err) {
      if (err.code === '42703') {
        try {
          const fallback = await pool.query(
            `SELECT id, name, item_key, is_active, data
               FROM ${src.table}
              WHERE client_id::text = $1`,
            [clientId]
          );
          for (const row of fallback.rows) {
            const data = row.data && typeof row.data === 'object' ? row.data : {};
            const mapping = data.checkmkMapping && typeof data.checkmkMapping === 'object' ? data.checkmkMapping : {};
            const host = String(data.checkmk_host_name || mapping.checkmk_host_name || '').trim();
            if (!host) continue;
            mappings.push(mappingFromEquipmentRow({
              ...row,
              checkmk_host_name: host,
              checkmk_site: data.checkmk_site || mapping.checkmk_site || null,
              checkmk_service_name: data.checkmk_service_name || mapping.checkmk_service_name || null
            }, src.type, clientId));
          }
        } catch (inner) {
          if (inner.code !== '42P01') console.warn(`[checkmk mapping] ${src.table}:`, inner.message);
        }
      } else if (err.code !== '42P01') {
        console.warn(`[checkmk mapping] ${src.table}:`, err.message);
      }
    }
  }
  return mappings;
}

async function updateEquipmentMapping({ clientId, equipmentType, equipmentId, hostName, siteVal, serviceVal }) {
  const table = TYPE_TO_TABLE[equipmentType];
  if (!table || !equipmentId) return null;
  const columnsResult = await pool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  const available = new Set(columnsResult.rows.map(r => r.column_name));
  const hasCheckmkColumns = available.has('checkmk_host_name') && available.has('checkmk_site') && available.has('checkmk_service_name');
  let result;
  if (hasCheckmkColumns) {
    result = await pool.query(
      `UPDATE ${table}
          SET checkmk_host_name = $1::varchar,
              checkmk_site = $2::varchar,
              checkmk_service_name = $3::varchar,
              data = COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
                'checkmk_host_name', to_jsonb($1::varchar),
                'checkmk_site', to_jsonb($2::varchar),
                'checkmk_service_name', to_jsonb($3::varchar)
              ),
              updated_at = NOW()
        WHERE client_id::text = $4::text AND id::text = $5::text
        RETURNING id, name, item_key, is_active, checkmk_host_name, checkmk_site, checkmk_service_name`,
      [hostName, siteVal, serviceVal, clientId, equipmentId]
    );
  } else {
    result = await pool.query(
      `UPDATE ${table}
          SET data = COALESCE(data::jsonb, '{}'::jsonb) || jsonb_build_object(
                'checkmk_host_name', to_jsonb($1::varchar),
                'checkmk_site', to_jsonb($2::varchar),
                'checkmk_service_name', to_jsonb($3::varchar)
              ),
              updated_at = NOW()
        WHERE client_id::text = $4::text AND id::text = $5::text
        RETURNING id, name, item_key, is_active,
                  data::jsonb->>'checkmk_host_name' AS checkmk_host_name,
                  data::jsonb->>'checkmk_site' AS checkmk_site,
                  data::jsonb->>'checkmk_service_name' AS checkmk_service_name`,
      [hostName, siteVal, serviceVal, clientId, equipmentId]
    );
  }
  if (!result.rows[0]) return null;
  return mappingFromEquipmentRow(result.rows[0], equipmentType, clientId);
}

router.get('/mapping/:clientId', verifyJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    const mappings = await loadEquipmentMappings(clientId);
    res.json(mappings);
  } catch (error) {
    console.error('Error loading CheckMK mappings:', error);
    res.status(500).json({
      error: 'Error loading mappings',
      details: error.message
    });
  }
});
router.get('/mapping/:clientId/stats', verifyJWT, async (req, res) => {
  try {
    const { clientId } = req.params;
    const mappings = await loadEquipmentMappings(clientId);
    const total = mappings.length;
    res.json({
      stats: total > 0 ? [{ type: 'CheckMK', count: total }] : [],
      total
    });
  } catch (error) {
    console.error('Error loading CheckMK statistics:', error);
    res.status(500).json({
      error: 'Error loading statistics',
      details: error.message
    });
  }
});
router.post('/mapping', verifyJWT, async (req, res) => {
  try {
    const {
      client_id,
      equipment_type,
      equipment_id,
      checkmk_host_name,
      checkmk_service_name,
      checkmk_site
    } = req.body;
    if (!client_id || !equipment_type || !equipment_id || !checkmk_host_name) {
      return res.status(400).json({
        error: 'client_id, equipment_type, equipment_id et checkmk_host_name are required'
      });
    }
    const hostName = String(checkmk_host_name).trim();
    const siteVal = checkmk_site && String(checkmk_site).trim() ? String(checkmk_site).trim() : null;
    const serviceVal = checkmk_service_name && String(checkmk_service_name).trim() ? String(checkmk_service_name).trim() : null;
    const mapping = await updateEquipmentMapping({
      clientId: client_id,
      equipmentType: equipment_type,
      equipmentId: equipment_id,
      hostName,
      siteVal,
      serviceVal
    });
    if (!mapping) {
      return res.status(404).json({
        error: 'Equipment not found',
        details: `No row with client_id=${client_id} and id=${equipment_id}`
      });
    }
    // Sync monitoring ASAP so inventory voyants + supervision center see warning/critical.
    const family = TYPE_TO_FAMILY[equipment_type] || null;
    if (family && hostName && SYNCABLE_FAMILIES.has(family)) {
      runEquipmentMonitoringSync(req, {
        equipmentId: equipment_id,
        clientId: client_id,
        family,
        hostName,
        site: siteVal,
        force: true
      }).catch(err => {
        console.warn('[checkmk mapping] post-map sync:', err.message);
      });
    }
    res.json(mapping);
  } catch (error) {
    console.error('Mapping error:', error.message, error.detail);
    res.status(500).json({
      error: 'Error creating/updating mapping',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});
router.delete('/mapping/:id', verifyJWT, async (req, res) => {
  try {
    const { id } = req.params;
    let cleared = null;
    for (const src of EQUIPMENT_MAPPING_SOURCES) {
      try {
        const found = await pool.query(
          `SELECT id, client_id, name, item_key, is_active FROM ${src.table} WHERE id::text = $1 LIMIT 1`,
          [id]
        );
        if (!found.rows[0]) continue;
        await updateEquipmentMapping({
          clientId: found.rows[0].client_id,
          equipmentType: src.type,
          equipmentId: id,
          hostName: null,
          siteVal: null,
          serviceVal: null
        });
        cleared = { id, equipment_type: src.type };
        break;
      } catch (err) {
        if (err.code !== '42P01' && err.code !== '42703') {
          console.warn(`[checkmk mapping delete] ${src.table}:`, err.message);
        }
      }
    }
    if (!cleared) {
      try {
        const mappingResult = await pool.query(`SELECT * FROM v_b_clients_host_mapping WHERE id::text = $1`, [id]);
        if (mappingResult.rows[0]) {
          await pool.query(`DELETE FROM v_b_clients_host_mapping WHERE id::text = $1`, [id]);
          cleared = mappingResult.rows[0];
        }
      } catch (err) {
        if (err.code !== '42P01' && err.code !== '42703') throw err;
      }
    }
    if (!cleared) {
      return res.status(404).json({
        error: 'Mapping not found'
      });
    }
    res.json({
      success: true,
      deleted: cleared
    });
  } catch (error) {
    res.status(500).json({
      error: 'Error deleting mapping'
    });
  }
});
export default router;
