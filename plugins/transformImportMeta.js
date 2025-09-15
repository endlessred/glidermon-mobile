// plugins/transformImportMeta.js
module.exports = function ({ types: t }) {
  return {
    name: "transform-import-meta-to-object",
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === "import" && path.node.property.name === "meta") {
          // Replace `import.meta` with an empty object (or {url:""} if needed)
          path.replaceWith(t.objectExpression([]));
        }
      },
    },
  };
};
