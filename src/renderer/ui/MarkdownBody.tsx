import type { Components } from "react-markdown";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  text: string;
};

const components: Components = {
  a: ({ href, children }) => {
    return (
      <a
        href={href}
        onClick={(event) => {
          event.preventDefault();
          if (href) {
            void window.exevibe.openExternal(href);
          }
        }}
      >
        {children}
      </a>
    );
  },
};

export function MarkdownBody(props: Props) {
  return (
    <div className="md">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {props.text}
      </Markdown>
    </div>
  );
}
