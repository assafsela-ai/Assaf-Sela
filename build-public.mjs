import { cp, mkdir, readFile, readdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("./dist/", import.meta.url));
const previewRobots = '  <meta name="robots" content="noindex, nofollow">';
const previewImage = /(<meta property="og:image" content=")(?:\.\/|\.\.\/\.\.\/)assets\/social-preview\.jpg(")/;

function escapeMarkup(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

async function buildPublicSite(siteUrlArg, outputArg) {
  if (!siteUrlArg || !outputArg) {
    throw new Error("Usage: node build-public.mjs https://your-domain.example[/site-path/] <new-output-directory>");
  }

  const siteUrl = new URL(siteUrlArg);
  if (siteUrl.protocol !== "https:" || siteUrl.username || siteUrl.password || siteUrl.search || siteUrl.hash) {
    throw new Error("Provide an HTTPS site URL without credentials, a query, or a fragment.");
  }

  if (!siteUrl.pathname.endsWith("/")) siteUrl.pathname += "/";

  const requestedOutput = resolve(outputArg);
  const output = join(await realpath(dirname(requestedOutput)), basename(requestedOutput));
  const fromSource = relative(await realpath(source), output);
  if (!fromSource || (!isAbsolute(fromSource) && fromSource !== ".." && !fromSource.startsWith(`..${sep}`))) {
    throw new Error("Choose a new output directory outside dist.");
  }

  const projects = (await readdir(join(source, "work"), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const pages = [
    { file: "index.html", url: siteUrl.href },
    ...projects.map((name) => ({
      file: join("work", name, "index.html"),
      url: new URL(`work/${encodeURIComponent(name)}/`, siteUrl).href,
    })),
  ];
  const image = escapeMarkup(new URL("assets/social-preview.jpg", siteUrl).href);
  const renderedPages = await Promise.all(pages.map(async ({ file, url }) => {
    const html = await readFile(join(source, file), "utf8");
    if (!html.includes(previewRobots) || !previewImage.test(html)) {
      throw new Error(`Preview metadata is missing from ${file}.`);
    }
    const canonical = escapeMarkup(url);
    return {
      file,
      html: html
        .replace(previewRobots, `  <link rel="canonical" href="${canonical}">\n  <meta property="og:url" content="${canonical}">`)
        .replace(previewImage, (_, start, end) => `${start}${image}${end}`),
    };
  }));

  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(({ url }) => `  <url><loc>${escapeMarkup(url)}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
  const robots = `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", siteUrl).href}\n`;

  await mkdir(output);
  await cp(source, output, { recursive: true });
  await Promise.all([
    ...renderedPages.map(({ file, html }) => writeFile(join(output, file), html, "utf8")),
    writeFile(join(output, "sitemap.xml"), sitemap, "utf8"),
    writeFile(join(output, "robots.txt"), robots, "utf8"),
  ]);
  console.log(`Built ${pages.length} public pages in ${output}`);
}

try {
  await buildPublicSite(process.argv[2], process.argv[3]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
