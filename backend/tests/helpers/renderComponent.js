import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

// Renders one of the frontend's React components to HTML, so a test can check what a page would actually show.
// The component is compiled with esbuild (already installed for the frontend build) together with React, in memory.

const require = createRequire(import.meta.url);
const frontendSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "frontend", "src");

export const renderComponent = (componentFile, props = {}) => {
  const esbuild = require(path.resolve(frontendSrc, "..", "node_modules", "esbuild"));
  const entry = `
    import React from "react";
    import { renderToStaticMarkup } from "react-dom/server";
    import Component from ${JSON.stringify("./" + componentFile)};
    export const render = (props) => renderToStaticMarkup(React.createElement(Component, props));
  `;
  const { outputFiles } = esbuild.buildSync({
    stdin: { contents: entry, resolveDir: frontendSrc, loader: "jsx" },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    define: { "import.meta.env": "{}" },
    logLevel: "silent",
  });
  const module = { exports: {} };
  new Function("module", "exports", "require", outputFiles[0].text)(module, module.exports, require);
  return module.exports.render(props);
};
