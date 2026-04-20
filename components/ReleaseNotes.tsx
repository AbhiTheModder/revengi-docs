"use client";

import { useEffect, useState } from "react";

interface ParsedSection {
  title: string;
  items: string[];
}

interface ParsedCallout {
  type: string;
  lines: string[];
}

interface ParsedBody {
  sections: ParsedSection[];
  callouts: ParsedCallout[];
  blockquotes: string[][];
  changelogUrl: string | null;
  paragraphs: string[];
}

/** Parse the GitHub release body into structured data */
function parseReleaseBody(body: string): ParsedBody {
  const lines = body.split("\n");
  const sections: ParsedSection[] = [];
  const callouts: ParsedCallout[] = [];
  const blockquotes: string[][] = [];
  const paragraphs: string[] = [];
  let changelogUrl: string | null = null;
  let currentSection: ParsedSection | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // ## Section heading
    if (line.startsWith("## ")) {
      if (currentSection) sections.push(currentSection);
      currentSection = { title: line.slice(3).trim(), items: [] };
      i++;
      continue;
    }

    // > [!TIP] / [!NOTE] callout blocks
    if (/^>\s*\[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]/.test(line)) {
      const typeMatch = line.match(/\[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]/);
      const type = typeMatch ? typeMatch[1] : "NOTE";
      const calloutLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].startsWith(">")) {
        calloutLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      callouts.push({ type, lines: calloutLines });
      continue;
    }

    // > Regular blockquote
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blockquotes.push(quoteLines);
      continue;
    }

    // - List item under current section
    if (/^\s*-\s/.test(line) && currentSection) {
      currentSection.items.push(line.replace(/^\s*-\s*/, ""));
      i++;
      continue;
    }

    // Full Changelog
    if (line.startsWith("**Full Changelog**:") || line.startsWith("Full Changelog:")) {
      changelogUrl = line.replace(/^\*?\*?Full Changelog\*?\*?:\s*/, "").trim();
      i++;
      continue;
    }

    // Default paragraph
    paragraphs.push(line);
    i++;
  }

  if (currentSection) sections.push(currentSection);
  return { sections, callouts, blockquotes, changelogUrl, paragraphs };
}


/** Inline markdown: **bold**, *italic*, `code`, [text](url) */
function renderInline(text: string): React.ReactNode[] {
  const regex = /(\[([^\]]+)\]\(([^)]+)\))|(`[^`]+`)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-foreground underline decoration-border underline-offset-4 hover:decoration-muted-foreground"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      parts.push(
        <code
          key={match.index}
          className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
        >
          {match[4].slice(1, -1)}
        </code>
      );
    } else if (match[5]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[5]}
        </strong>
      );
    } else if (match[6]) {
      parts.push(
        <em key={match.index} className="italic">
          {match[6]}
        </em>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}


/** Section icon based on title */
function SectionIcon({ title }: { title: string }) {
  const t = title.toLowerCase();

  if (t.includes("feature")) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    );
  }
  if (t.includes("ui") || t.includes("change")) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    );
  }
  if (t.includes("bug") || t.includes("fix")) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1 5.1a2.121 2.121 0 01-3-3l5.1-5.1m0 0L3.34 7.09a2.121 2.121 0 013-3l5.08 5.08m0 0l4.17-4.17a2.121 2.121 0 013 3L13.41 12m0 0l5.08 5.08a2.121 2.121 0 01-3 3l-5.08-5.08" />
      </svg>
    );
  }
  if (t.includes("translation") || t.includes("i18n") || t.includes("locale")) {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
      </svg>
    );
  }

  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}


/** Callout icon */
function CalloutIcon({ type }: { type: string }) {
  if (type === "TIP") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    );
  }
  if (type === "WARNING" || type === "CAUTION") {
    return (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  );
}


export default function LatestReleaseNotes() {
  const [release, setRelease] = useState<{
    name: string;
    body: string;
    assets: { name: string; digest: string }[];
  } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/RevEngiSquad/revengi-app/releases/latest")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`GitHub API error: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setRelease({
          name: data.name,
          body: data.body,
          assets: Array.isArray(data.assets)
            ? data.assets.map((a: any) => ({
              name: a.name,
              digest: typeof a.digest === "string" ? a.digest : "-",
            }))
            : [],
        });
      })
      .catch((err) => {
        console.error("Failed to fetch release notes:", err);
        setError("Unable to load release notes at this time.");
      });
  }, []);

  const handleCopy = (name: string, text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(name);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => alert("Copy failed. Try manually."));
  };

  if (error) {
    return <p className="text-destructive text-sm">{error}</p>;
  }

  if (!release) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        Loading release notes...
      </div>
    );
  }

  const parsed = parseReleaseBody(release.body);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{release.name}</h2>
        {parsed.changelogUrl && (
          <a
            href={parsed.changelogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            View Full Changelog
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Section cards grid */}
      {parsed.sections.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {parsed.sections.map((section, idx) => {
            const hasChanges = section.items.length > 0 && !section.items.every((it) => it.trim() === "N/A");
            return (
              <div
                key={idx}
                className={`rounded-lg border p-4 transition-colors ${
                  hasChanges
                    ? "border-border bg-muted/40"
                    : "border-border/50 bg-muted/20"
                }`}
              >
                <div className="mb-2.5 flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-md border ${
                    hasChanges
                      ? "border-border bg-muted text-foreground/80"
                      : "border-border/50 bg-muted/50 text-muted-foreground/50"
                  }`}>
                    <SectionIcon title={section.title} />
                  </div>
                  <h3 className={`text-sm font-semibold ${hasChanges ? "text-foreground" : "text-muted-foreground/70"}`}>
                    {section.title}
                  </h3>
                </div>
                {hasChanges ? (
                  <ul className="space-y-1.5 pl-9">
                    {section.items.filter((it) => it.trim() !== "N/A").map((item, j) => (
                      <li key={j} className="flex items-baseline gap-2 text-sm text-muted-foreground">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/30" />
                        <span>{renderInline(item)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pl-9 text-xs text-muted-foreground/40">No changes in this release</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Blockquotes */}
      {parsed.blockquotes.map((quoteLines, idx) => (
        <blockquote
          key={`bq-${idx}`}
          className="border-l-[3px] border-border pl-4 text-sm text-muted-foreground"
        >
          {quoteLines.map((ql, j) => (
            <p key={j}>{renderInline(ql)}</p>
          ))}
        </blockquote>
      ))}

      {/* Callouts */}
      {parsed.callouts.length > 0 && (
        <div className="space-y-3">
          {parsed.callouts.map((callout, idx) => {
            const colorMap: Record<string, string> = {
              TIP: "border-emerald-500/30 bg-emerald-500/[0.04]",
              NOTE: "border-blue-500/30 bg-blue-500/[0.04]",
              WARNING: "border-yellow-500/30 bg-yellow-500/[0.04]",
              IMPORTANT: "border-purple-500/30 bg-purple-500/[0.04]",
              CAUTION: "border-red-500/30 bg-red-500/[0.04]",
            };
            const labelColor: Record<string, string> = {
              TIP: "text-emerald-400",
              NOTE: "text-blue-400",
              WARNING: "text-yellow-400",
              IMPORTANT: "text-purple-400",
              CAUTION: "text-red-400",
            };
            const iconBg: Record<string, string> = {
              TIP: "bg-emerald-500/10 text-emerald-400",
              NOTE: "bg-blue-500/10 text-blue-400",
              WARNING: "bg-yellow-500/10 text-yellow-400",
              IMPORTANT: "bg-purple-500/10 text-purple-400",
              CAUTION: "bg-red-500/10 text-red-400",
            };

            return (
              <div
                key={`callout-${idx}`}
                className={`rounded-lg border px-4 py-3 ${colorMap[callout.type] || colorMap.NOTE}`}
              >
                <div className="mb-2 flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-md ${iconBg[callout.type] || iconBg.NOTE}`}>
                    <CalloutIcon type={callout.type} />
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-wider ${labelColor[callout.type] || labelColor.NOTE}`}>
                    {callout.type}
                  </span>
                </div>
                <div className="space-y-1 pl-8 text-sm text-muted-foreground">
                  {callout.lines.map((cl, j) => (
                    <p key={j}>{renderInline(cl.replace(/^-\s*/, "• "))}</p>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paragraphs */}
      {parsed.paragraphs.map((p, idx) => (
        <p key={`p-${idx}`} className="text-sm text-muted-foreground">
          {renderInline(p)}
        </p>
      ))}

      {/* SHA-256 Checksums */}
      {release.assets.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">SHA-256 Checksums</h3>
          <div className="overflow-hidden rounded-lg border border-border">
            {release.assets.map((asset, i) => {
              const digestWithoutPrefix = asset.digest.replace("sha256:", "");
              const isLast = i === release.assets.length - 1;
              return (
                <div
                  key={asset.name}
                  className={`grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2.5 font-mono text-xs ${!isLast ? "border-b border-border" : ""
                    } ${i % 2 === 0 ? "bg-muted/30" : "bg-muted/60"}`}
                >
                  <span className="min-w-0 break-all">
                    <span className="font-medium text-foreground">{asset.name}:</span>{" "}
                    <span className="text-muted-foreground">{digestWithoutPrefix}</span>
                  </span>
                  <button
                    onClick={() => handleCopy(asset.name, digestWithoutPrefix)}
                    className="rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-accent shrink-0"
                  >
                    {copied === asset.name ? "COPIED" : "COPY"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}