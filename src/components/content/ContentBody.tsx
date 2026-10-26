import Image from 'next/image';
import type { Block, ImageUse, Inline, LinkTarget, Snapshot } from '@/lib/content/types';

export interface ContentBodyProps {
  readonly blocks: readonly Block[];
  readonly snapshot: Snapshot;
  readonly className?: string;
}

function resolveHref(target: LinkTarget, snapshot: Snapshot): string | null {
  if (target.kind === 'external') return target.url;
  if (target.kind === 'internal') return target.path;
  const record = snapshot[target.collection].find(item => item.id === target.recordId);
  return record ? `/${record.locale}/${target.collection === 'posts' ? 'blog' : 'projects'}/${record.slug}/` : null;
}

function renderInlines(items: readonly Inline[], snapshot: Snapshot) {
  return items.map((item, i) => {
    if (item.type === 'text') return <span key={i}>{item.text}</span>;
    const target = resolveHref(item.target, snapshot);
    if (!target) return <span key={i}>{item.label}</span>;
    const isExternal = item.target.kind === 'external';
    return (
      <a
        key={i}
        className="text-[var(--color-brick-deep)] hover:underline underline-offset-4 font-medium focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
        href={target}
        {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {item.label}
      </a>
    );
  });
}

function renderImage(use: ImageUse, snapshot: Snapshot) {
  const media = snapshot.media.find(asset => asset.id === use.mediaId);
  if (!media) {
    throw new Error('Invariant violation: referenced media asset not found in snapshot');
  }
  const isDecorative = !use.alt;
  return (
    <figure className="my-6 space-y-2">
      <Image
        src={media.path}
        alt={use.alt || ''}
        width={media.width}
        height={media.height}
        className="rounded-xs border border-[var(--color-border)] max-w-full h-auto"
        {...(isDecorative ? { role: 'presentation' } : {})}
      />
      {'caption' in use && use.caption ? (
        <figcaption className="text-xs font-mono text-[var(--text-secondary)] text-center">
          {use.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function renderBlock(block: Block, snapshot: Snapshot) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="font-body text-base sm:text-lg text-[var(--color-ink)] leading-relaxed">
          {renderInlines(block.children, snapshot)}
        </p>
      );
    case 'heading':
      if (block.level === 2) {
        return (
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-ink)] tracking-tight pt-4">
            {block.text}
          </h2>
        );
      }
      if (block.level === 3) {
        return (
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-ink)] tracking-tight pt-2">
            {block.text}
          </h3>
        );
      }
      return (
        <h4 className="font-display text-lg sm:text-xl font-bold text-[var(--color-ink)] tracking-tight">
          {block.text}
        </h4>
      );
    case 'list': {
      const items = block.items.map((item, i) => (
        <li key={i} className="leading-relaxed">
          {renderInlines(item, snapshot)}
        </li>
      ));
      return block.ordered ? (
        <ol className="list-decimal pl-6 space-y-2 font-body text-base text-[var(--color-ink)]">
          {items}
        </ol>
      ) : (
        <ul className="list-disc pl-6 space-y-2 font-body text-base text-[var(--color-ink)]">
          {items}
        </ul>
      );
    }
    case 'quote':
      return (
        <blockquote className="border-l-2 border-[var(--color-brick)] pl-4 sm:pl-6 italic font-body text-base sm:text-lg text-[var(--color-ink)] my-6">
          <div>{renderInlines(block.children, snapshot)}</div>
          {block.attribution ? (
            <cite className="block not-italic text-xs sm:text-sm font-mono text-[var(--text-secondary)] mt-2">
              — {block.attribution}
            </cite>
          ) : null}
        </blockquote>
      );
    case 'code':
      return (
        <div className="my-6 rounded-xs border border-[#243438] bg-[var(--color-dark)] overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-[var(--color-dark-copy)]/80 bg-[#121c1f]">
            <span>{block.language || 'code'}</span>
          </div>
          <pre
            tabIndex={0}
            role="region"
            aria-label={block.language ? `${block.language} code block` : 'Code block'}
            className="p-4 sm:p-5 overflow-x-auto text-xs sm:text-sm font-mono text-[var(--color-dark-copy)] leading-relaxed focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] focus-visible:outline-offset-2"
          >
            <code>{block.code}</code>
          </pre>
        </div>
      );
    case 'image':
      return renderImage(block.image, snapshot);
  }
}

export default function ContentBody({ blocks, snapshot, className = '' }: ContentBodyProps) {
  return (
    <div className={`space-y-6 ${className}`.trim()}>
      {blocks.map((block, i) => (
        <div key={i}>{renderBlock(block, snapshot)}</div>
      ))}
    </div>
  );
}
