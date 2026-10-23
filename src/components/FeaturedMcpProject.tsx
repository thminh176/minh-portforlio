interface FeaturedMcpProjectProps {
  locale: string;
}

export default function FeaturedMcpProject({ locale }: FeaturedMcpProjectProps) {
  const isVi = locale === 'vi';

  const title = 'MCP Project Assistant';
  const description = isVi
    ? 'MCP server chạy local giúp AI đọc mã, tìm kiếm và xem Git diff trong workspace đã chọn. Thay đổi được xem trước trước khi áp dụng.'
    : 'A local MCP server for reading code, searching and reviewing Git diffs in a selected workspace, with previews before edits are applied.';

  const repoUrl = 'https://github.com/thminh176/mcp-project-assistant';
  const repoLabel = isVi ? 'Xem mã nguồn trên GitHub' : 'View source code on GitHub';
  const repoAriaLabel = isVi
    ? 'MCP Project Assistant - Xem mã nguồn trên GitHub (mở trong tab mới)'
    : 'MCP Project Assistant - View source code on GitHub (opens in new tab)';

  const diagramAriaLabel = isVi
    ? 'Sơ đồ năng lực MCP: Đọc mã, Xem diff, Áp dụng thay đổi'
    : 'MCP capability flow: Read code, Review diffs, Apply previewed changes';

  return (
    <article className="space-y-3">
      {/* Mono Ledger */}
      <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)]">
        <span>REPOSITORY / 01</span>
      </div>

      {/* Dark Graphite MCP Panel */}
      <div className="bg-[var(--color-dark)] text-[var(--color-dark-copy)] border border-[#243438] rounded-xs p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content (Left) */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {title}
            </h3>

            <p className="font-body text-sm sm:text-base text-[var(--color-dark-copy)] leading-relaxed max-w-xl">
              {description}
            </p>

            {/* Sourced Tech Stack */}
            <div className="pt-2 sm:pt-4 flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono text-[var(--color-dark-copy)]">
              <span>TypeScript</span>
              <span>MCP SDK</span>
              <span>Windows / WSL</span>
            </div>
          </div>

          {/* Conceptual Capability Diagram (Right) */}
          <div className="lg:col-span-4 w-full flex justify-start lg:justify-end">
            <div
              className="w-full sm:w-52 bg-[#1b282c] border border-white/10 rounded-xs p-4 space-y-2.5 font-mono text-xs"
              role="region"
              aria-label={diagramAriaLabel}
            >
              <div className="flex items-center justify-between text-[var(--color-dark-copy)] tracking-wider">
                <span>READ</span>
                <span className="text-[10px] text-white/50">workspace</span>
              </div>
              <div className="flex items-center justify-between text-[var(--color-dark-copy)] tracking-wider">
                <span>REVIEW</span>
                <span className="text-[10px] text-white/50">git diff</span>
              </div>
              <div className="border-t border-white/10 my-2" aria-hidden="true" />
              <div className="flex items-center justify-between text-white font-medium tracking-wider">
                <span>APPLY</span>
                <span className="text-[10px] text-white/70">previewed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Rule and GitHub Link */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={repoAriaLabel}
            className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-[var(--color-dark-copy)] transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2 min-h-[44px] py-2"
          >
            <span>{repoLabel}</span>
            <span aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </article>
  );
}
