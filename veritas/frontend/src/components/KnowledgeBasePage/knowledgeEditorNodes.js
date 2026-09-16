import { Node, mergeAttributes, InputRule } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";

export function toVideoEmbedSrc(raw) {
  const url = String(raw || "").trim();
  if (!url) return "";
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/i);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const loom = url.match(/loom\.com\/(?:share|embed)\/([a-z0-9]+)/i);
  if (loom) return `https://www.loom.com/embed/${loom[1]}`;
  if (/^https?:\/\//i.test(url)) return url;
  return "";
}

function ToggleBlockView({ node, updateAttributes, editor }) {
  return (
    <NodeViewWrapper as="details" className="kb-toggle" data-type="toggle-block" open>
      <summary contentEditable={false} className="kb-toggle-summary">
        <input
          className="kb-toggle-input"
          value={node.attrs.summary || ""}
          disabled={!editor.isEditable}
          onChange={event => updateAttributes({ summary: event.target.value })}
          placeholder="…"
        />
      </summary>
      <NodeViewContent className="kb-toggle-content" data-type="toggle-content" />
    </NodeViewWrapper>
  );
}

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      tone: { default: "info", parseHTML: el => el.getAttribute("data-tone") || "info", renderHTML: attrs => ({ "data-tone": attrs.tone || "info" }) }
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='callout']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const tone = HTMLAttributes["data-tone"] || HTMLAttributes.tone || "info";
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout", "data-tone": tone, class: `kb-callout kb-callout-${tone}` }), 0];
  },
  addCommands() {
    return {
      setCallout: tone => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { tone: tone || "info" },
        content: [{ type: "paragraph" }]
      })
    };
  }
});

export const ToggleBlock = Node.create({
  name: "toggleBlock",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes() {
    return {
      summary: { default: "", parseHTML: el => el.getAttribute("data-summary") || el.querySelector("summary")?.textContent || "", renderHTML: attrs => ({ "data-summary": attrs.summary || "" }) }
    };
  },
  parseHTML() {
    return [{ tag: "details[data-type='toggle-block']", contentElement: "div[data-type='toggle-content']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const summary = HTMLAttributes["data-summary"] || HTMLAttributes.summary || "";
    return [
      "details",
      mergeAttributes(HTMLAttributes, { "data-type": "toggle-block", class: "kb-toggle", open: "" }),
      ["summary", { class: "kb-toggle-summary" }, summary],
      ["div", { "data-type": "toggle-content", class: "kb-toggle-content" }, 0]
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(ToggleBlockView);
  },
  addCommands() {
    return {
      setToggleBlock: summary => ({ commands }) => commands.insertContent({
        type: this.name,
        attrs: { summary: summary || "" },
        content: [{ type: "paragraph" }]
      })
    };
  }
});

export const VideoEmbed = Node.create({
  name: "videoEmbed",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      src: { default: null },
      provider: { default: "embed" }
    };
  },
  parseHTML() {
    return [
      { tag: "div[data-type='video-embed']" },
      { tag: "video[data-type='video-embed']" }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    const { src, provider, ...rest } = HTMLAttributes;
    if (provider === "file") {
      return ["video", mergeAttributes(rest, { "data-type": "video-embed", controls: "true", src, class: "kb-video" })];
    }
    return [
      "div",
      mergeAttributes(rest, { "data-type": "video-embed", class: "kb-video-embed", "data-src": src }),
      ["iframe", { src, allowfullscreen: "true", frameborder: "0", title: "Video", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" }]
    ];
  },
  addCommands() {
    return {
      setVideoEmbed: attrs => ({ commands }) => commands.insertContent({ type: this.name, attrs })
    };
  }
});

function PdfEmbedView({ node, selected }) {
  const src = node.attrs.src || "";
  const title = node.attrs.title || "PDF";
  return (
    <NodeViewWrapper
      as="div"
      className={`kb-pdf-embed${selected ? " ProseMirror-selectednode" : ""}`}
      data-type="pdf-embed"
      data-src={src}
      data-title={title}
    >
      <div className="kb-pdf-toolbar" contentEditable={false}>
        <span className="kb-pdf-name">{title}</span>
        {src ? (
          <a href={src} target="_blank" rel="noopener noreferrer" className="kb-pdf-open" onClick={event => event.stopPropagation()}>
            ↗
          </a>
        ) : null}
      </div>
      {src ? (
        <iframe src={src} title={title} className="kb-pdf" />
      ) : (
        <div className="kb-pdf-empty">PDF</div>
      )}
    </NodeViewWrapper>
  );
}

export const PdfEmbed = Node.create({
  name: "pdfEmbed",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: el => el.getAttribute("data-src") || el.getAttribute("src") || el.querySelector?.("iframe")?.getAttribute("src") || null
      },
      title: {
        default: "PDF",
        parseHTML: el => el.getAttribute("data-title") || el.getAttribute("title") || el.querySelector?.("iframe")?.getAttribute("title") || "PDF"
      }
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='pdf-embed']" }, { tag: "iframe[data-type='pdf-embed']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const src = HTMLAttributes.src || HTMLAttributes["data-src"] || "";
    const title = HTMLAttributes.title || HTMLAttributes["data-title"] || "PDF";
    return [
      "div",
      {
        "data-type": "pdf-embed",
        "data-src": src,
        "data-title": title,
        class: "kb-pdf-embed"
      },
      ["iframe", { src, title, class: "kb-pdf" }]
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PdfEmbedView);
  },
  addCommands() {
    return {
      setPdfEmbed: attrs => ({ commands }) => commands.insertContent({ type: this.name, attrs })
    };
  }
});

export const Attachment = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      href: { default: null },
      name: { default: "file" },
      mime: { default: "" }
    };
  },
  parseHTML() {
    return [{ tag: "a[data-type='attachment']" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-type": "attachment",
        class: "kb-attachment",
        href: HTMLAttributes.href,
        download: HTMLAttributes.name || true,
        rel: "noopener noreferrer"
      }),
      HTMLAttributes.name || "file"
    ];
  },
  addCommands() {
    return {
      setAttachment: attrs => ({ commands }) => commands.insertContent({ type: this.name, attrs })
    };
  }
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      latex: { default: "" }
    };
  },
  parseHTML() {
    return [{ tag: "div[data-type='math-block']" }];
  },
  renderHTML({ HTMLAttributes }) {
    const latex = HTMLAttributes.latex || "";
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "math-block", class: "kb-math", "data-latex": latex }), latex];
  },
  addCommands() {
    return {
      setMathBlock: latex => ({ commands }) => commands.insertContent({ type: this.name, attrs: { latex } })
    };
  }
});

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  atom: true,
  selectable: true,
  parseHTML() {
    return [{ tag: "div[data-type='page-break']" }];
  },
  renderHTML() {
    return ["div", { "data-type": "page-break", class: "kb-page-break" }];
  },
  addCommands() {
    return {
      setPageBreak: () => ({ commands }) => commands.insertContent({ type: this.name })
    };
  }
});

export const CustomEmoji = Node.create({
  name: "customEmoji",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addOptions() {
    return {
      getEmoji: () => null
    };
  },
  addAttributes() {
    return {
      name: {
        default: null,
        parseHTML: el => el.getAttribute("data-emoji") || null,
        renderHTML: attrs => (attrs.name ? { "data-emoji": attrs.name } : {})
      },
      src: {
        default: null,
        parseHTML: el => el.getAttribute("src") || null,
        renderHTML: attrs => (attrs.src ? { src: attrs.src } : {})
      }
    };
  },
  parseHTML() {
    return [{ tag: "img[data-emoji]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const name = HTMLAttributes["data-emoji"] || HTMLAttributes.name || "";
    return [
      "img",
      mergeAttributes(HTMLAttributes, {
        "data-emoji": name,
        class: "kb-emoji",
        alt: name ? `:${name}:` : "emoji",
        draggable: "false"
      })
    ];
  },
  addCommands() {
    return {
      insertCustomEmoji: attrs => ({ commands }) => {
        if (!attrs?.name || !attrs?.src) return false;
        return commands.insertContent({
          type: this.name,
          attrs: { name: attrs.name, src: attrs.src }
        });
      }
    };
  },
  addInputRules() {
    return [
      new InputRule({
        find: /:([a-z0-9][a-z0-9_-]{1,31}):$/,
        handler: ({ range, match, chain }) => {
          const name = match[1];
          const emoji = this.options.getEmoji?.(name);
          if (!emoji?.src && !emoji?.url) return null;
          const src = emoji.src || emoji.url;
          chain().deleteRange(range).insertContentAt(range.from, {
            type: this.name,
            attrs: { name, src }
          }).run();
        }
      })
    ];
  }
});

export const KNOWLEDGE_EDITOR_NODES = [Callout, ToggleBlock, VideoEmbed, PdfEmbed, Attachment, MathBlock, PageBreak, CustomEmoji];

export const KNOWLEDGE_ARTICLE_HTML_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "b", "i", "u", "s", "ul", "ol", "li", "a",
    "h1", "h2", "h3", "h4", "blockquote", "code", "pre", "span", "div", "label",
    "img", "table", "thead", "tbody", "tr", "th", "td", "hr", "input",
    "details", "summary", "iframe", "video", "source", "mark"
  ],
  ALLOWED_ATTR: [
    "id", "href", "target", "rel", "src", "alt", "title", "class", "colspan", "rowspan",
    "data-type", "data-checked", "data-tone", "data-summary", "data-src", "data-latex",
    "data-name", "data-title", "data-emoji", "type", "checked", "controls", "allowfullscreen", "allow",
    "frameborder", "download", "open", "width", "height", "name", "mime", "draggable"
  ],
  ADD_TAGS: ["iframe", "video", "source", "details", "summary"],
  ADD_ATTR: ["target", "allowfullscreen", "allow", "controls", "frameborder", "data-emoji", "draggable"]
};
