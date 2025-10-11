import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import type { Block } from '@/components/Editor';

// Parse markdown string to blocks
export async function parseMarkdown(markdown: string): Promise<Block[]> {
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm);

  const tree = processor.parse(markdown);
  return await processTreeToBlocks(tree);
}

// Convert blocks to markdown string
export async function serializeMarkdown(blocks: Block[]): Promise<string> {
  const processor = unified()
    .use(remarkStringify)
    .use(remarkGfm);

  const tree = await processBlocksToTree(blocks);
  return processor.stringify(tree);
}

// Process remark AST to blocks
async function processTreeToBlocks(tree: any): Promise<Block[]> {
  const blocks: Block[] = [];

  for (const child of tree.children || []) {
    await processNodeToBlocks(child, blocks);
  }

  return blocks;
}

// Process a single AST node to blocks
async function processNodeToBlocks(node: any, blocks: Block[]): Promise<void> {
  switch (node.type) {
    case 'heading':
      blocks.push({
        id: generateId(),
        type: `heading${node.depth}` as any,
        content: node.children?.[0]?.value || '',
        metadata: {},
        children: [],
      });
      break;

    case 'paragraph':
      blocks.push({
        id: generateId(),
        type: 'paragraph',
        content: node.children?.map((child: any) => child.value || '').join('') || '',
        metadata: {},
        children: [],
      });
      break;

    case 'list':
      if (node.ordered) {
        processListToBlocks(node, blocks, 'numbered-list');
      } else {
        processListToBlocks(node, blocks, 'bulleted-list');
      }
      break;

    case 'blockquote':
      blocks.push({
        id: generateId(),
        type: 'quote',
        content: node.children?.[0]?.children?.[0]?.value || '',
        metadata: {},
        children: [],
      });
      break;

    case 'code':
      blocks.push({
        id: generateId(),
        type: 'code',
        content: node.value || '',
        metadata: { language: node.lang || '' },
        children: [],
      });
      break;

    case 'thematicBreak':
      blocks.push({
        id: generateId(),
        type: 'divider',
        content: '',
        metadata: {},
        children: [],
      });
      break;

    case 'table':
      blocks.push({
        id: generateId(),
        type: 'table',
        content: JSON.stringify(convertTableNodeToData(node)),
        metadata: {
          rows: node.children?.[1]?.children?.length || 0,
          cols: node.children?.[0]?.children?.length || 0,
          headerRow: true,
          headerCol: false,
        },
        children: [],
      });
      break;
  }
}

// Process list nodes to blocks
function processListToBlocks(node: any, blocks: Block[], type: 'bulleted-list' | 'numbered-list'): void {
  for (const item of node.children || []) {
    const content = item.children?.[0]?.children?.[0]?.value || '';
    blocks.push({
      id: generateId(),
      type: type,
      content,
      metadata: {},
      children: [],
    });
  }
}

// Convert table AST node to data structure
function convertTableNodeToData(node: any): string[][] {
  const data: string[][] = [];

  if (!node.children?.length) return data;

  // Process header row
  const headerRow = node.children[0];
  if (headerRow.children) {
    data.push(headerRow.children.map((cell: any) => cell.children?.[0]?.value || ''));
  }

  // Process data rows
  for (let i = 1; i < node.children.length; i++) {
    const row = node.children[i];
    if (row.children) {
      data.push(row.children.map((cell: any) => cell.children?.[0]?.value || ''));
    }
  }

  return data;
}

// Convert blocks to remark AST
async function processBlocksToTree(blocks: Block[]): Promise<any> {
  const root: any = {
    type: 'root',
    children: [],
  };

  for (const block of blocks) {
    const node = await processBlockToNode(block);
    if (node) {
      root.children.push(node);
    }
  }

  return root;
}

// Convert a single block to AST node
async function processBlockToNode(block: Block): Promise<any | null> {
  switch (block.type) {
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return {
        type: 'heading',
        depth: parseInt(block.type.replace('heading', '')),
        children: [{ type: 'text', value: block.content }],
      };

    case 'paragraph':
      return {
        type: 'paragraph',
        children: [{ type: 'text', value: block.content }],
      };

    case 'bulleted-list':
      return {
        type: 'list',
        ordered: false,
        children: [{
          type: 'listItem',
          children: [{
            type: 'paragraph',
            children: [{ type: 'text', value: block.content }],
          }],
        }],
      };

    case 'numbered-list':
      return {
        type: 'list',
        ordered: true,
        children: [{
          type: 'listItem',
          children: [{
            type: 'paragraph',
            children: [{ type: 'text', value: block.content }],
          }],
        }],
      };

    case 'quote':
      return {
        type: 'blockquote',
        children: [{
          type: 'paragraph',
          children: [{ type: 'text', value: block.content }],
        }],
      };

    case 'code':
      return {
        type: 'code',
        lang: block.metadata?.language || null,
        value: block.content,
      };

    case 'divider':
      return { type: 'thematicBreak' };

    case 'table':
      const tableData = JSON.parse(block.content || '[]');
      return convertDataToTableNode(tableData);

    default:
      return null;
  }
}

// Convert table data to AST node
function convertDataToTableNode(data: string[][]): any {
  if (!data.length) return null;

  const table: any = {
    type: 'table',
    children: [],
  };

  // Header row
  const headerRow: any = {
    type: 'tableRow',
    children: data[0].map(cell => ({
      type: 'tableCell',
      children: [{ type: 'text', value: cell }],
    })),
  };
  table.children.push(headerRow);

  // Data rows
  for (let i = 1; i < data.length; i++) {
    const row: any = {
      type: 'tableRow',
      children: data[i].map(cell => ({
        type: 'tableCell',
        children: [{ type: 'text', value: cell }],
      })),
    };
    table.children.push(row);
  }

  return table;
}

// Generate unique ID for blocks
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Export/Import functions for files
export async function exportToMarkdown(blocks: Block[], title: string): Promise<string> {
  const markdown = await serializeMarkdown(blocks);
  return `# ${title}\n\n${markdown}`;
}

export async function importFromMarkdown(markdown: string): Promise<{ title: string; blocks: Block[] }> {
  // Extract title from first heading
  const lines = markdown.split('\n');
  let title = 'Untitled';
  const firstLine = lines[0]?.trim();

  if (firstLine?.startsWith('# ')) {
    title = firstLine.substring(2).trim();
  }

  // Remove title from markdown
  const contentLines = lines.slice(firstLine?.startsWith('# ') ? 1 : 0);
  const contentMarkdown = contentLines.join('\n').trim();

  const blocks = await parseMarkdown(contentMarkdown);

  return { title, blocks };
}
