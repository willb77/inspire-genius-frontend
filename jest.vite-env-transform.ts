/**
 * ts-jest AST transformer that replaces `import.meta.env.X` with
 * `process.env.X` so Vite-style env access works in Jest's CJS runtime.
 */
import type ts from "typescript";
import type { TsCompilerInstance } from "ts-jest";

export const name = "vite-env-transform";
export const version = 1;

export function factory(compilerInstance: TsCompilerInstance) {
  const tsModule = compilerInstance.configSet.compilerModule;

  function createVisitor(
    context: ts.TransformationContext
  ): ts.Visitor<ts.Node, ts.Node> {
    const visitor: ts.Visitor<ts.Node, ts.Node> = (node) => {
      // Match: import.meta.env.<PROP>  →  process.env.<PROP>
      if (
        tsModule.isPropertyAccessExpression(node) &&
        tsModule.isPropertyAccessExpression(node.expression) &&
        tsModule.isMetaProperty(node.expression.expression) &&
        node.expression.expression.keywordToken ===
          tsModule.SyntaxKind.ImportKeyword &&
        node.expression.name.text === "env"
      ) {
        return tsModule.factory.createPropertyAccessExpression(
          tsModule.factory.createPropertyAccessExpression(
            tsModule.factory.createIdentifier("process"),
            "env"
          ),
          node.name
        );
      }

      // Match: import.meta.env  →  process.env
      if (
        tsModule.isPropertyAccessExpression(node) &&
        tsModule.isMetaProperty(node.expression) &&
        node.expression.keywordToken ===
          tsModule.SyntaxKind.ImportKeyword &&
        node.name.text === "env"
      ) {
        return tsModule.factory.createPropertyAccessExpression(
          tsModule.factory.createIdentifier("process"),
          "env"
        );
      }

      return tsModule.visitEachChild(node, visitor, context);
    };

    return visitor;
  }

  return (context: ts.TransformationContext) =>
    (sourceFile: ts.SourceFile) =>
      tsModule.visitNode(sourceFile, createVisitor(context)) as ts.SourceFile;
}
