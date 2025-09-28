import { useState, useEffect } from "react";
import { Sidebar, type Page } from "@/components/Sidebar";
import { Editor, type Block } from "@/components/Editor";

interface PageData {
  id: string;
  title: string;
  blocks: Block[];
}

const Index = () => {
  const [pages, setPages] = useState<Page[]>([
    {
      id: "welcome",
      title: "Welcome to Notion Clone",
      isExpanded: false,
    },
  ]);
  
  const [pageData, setPageData] = useState<Record<string, PageData>>({
    welcome: {
      id: "welcome",
      title: "Welcome to Notion Clone",
      blocks: [
        {
          id: "1",
          type: "heading1",
          content: "Welcome to your Notion Clone! 🎉",
        },
        {
          id: "2",
          type: "paragraph",
          content: "This is a fully functional block-based editor inspired by Notion. You can create different types of content blocks:",
        },
        {
          id: "3",
          type: "bulleted-list",
          content: "Rich text editing with multiple block types",
        },
        {
          id: "4",
          type: "bulleted-list",
          content: "Hierarchical page organization",
        },
        {
          id: "5",
          type: "bulleted-list",
          content: "Clean, modern interface",
        },
        {
          id: "6",
          type: "heading2",
          content: "Getting Started",
        },
        {
          id: "7",
          type: "paragraph",
          content: "Try these features:",
        },
        {
          id: "8",
          type: "numbered-list",
          content: "Create a new page using the + button in the sidebar",
        },
        {
          id: "9",
          type: "numbered-list",
          content: "Type '/' to see block type options",
        },
        {
          id: "10",
          type: "numbered-list",
          content: "Hover over blocks to see action buttons",
        },
        {
          id: "11",
          type: "divider",
          content: "",
        },
        {
          id: "12",
          type: "paragraph",
          content: "Start writing and organizing your thoughts! ✨",
        },
      ],
    },
  });
  
  const [currentPageId, setCurrentPageId] = useState<string>("welcome");

  const currentPage = pageData[currentPageId];

  const handlePageSelect = (page: Page) => {
    setCurrentPageId(page.id);
  };

  const handlePageCreate = (parentId?: string) => {
    const newPageId = Math.random().toString(36).substring(2);
    const newPage: Page = {
      id: newPageId,
      title: "Untitled",
      isExpanded: false,
    };

    const newPageData: PageData = {
      id: newPageId,
      title: "Untitled",
      blocks: [
        {
          id: Math.random().toString(36).substring(2),
          type: "paragraph",
          content: "",
        },
      ],
    };

    // Add to pages list
    if (parentId) {
      // Add as child (simplified - would need recursive logic for deep nesting)
      setPages(prev => prev.map(p => 
        p.id === parentId 
          ? { ...p, children: [...(p.children || []), newPage], isExpanded: true }
          : p
      ));
    } else {
      setPages(prev => [...prev, newPage]);
    }

    // Add page data
    setPageData(prev => ({ ...prev, [newPageId]: newPageData }));
    setCurrentPageId(newPageId);
  };

  const handlePageDelete = (pageId: string) => {
    if (pageId === "welcome") return; // Don't delete welcome page
    
    setPages(prev => prev.filter(p => p.id !== pageId));
    setPageData(prev => {
      const newData = { ...prev };
      delete newData[pageId];
      return newData;
    });
    
    if (currentPageId === pageId) {
      setCurrentPageId("welcome");
    }
  };

  const handlePageRename = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, title: newTitle } : p
    ));
    setPageData(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], title: newTitle }
    }));
  };

  const handleTitleChange = (newTitle: string) => {
    if (!currentPage) return;
    
    setPageData(prev => ({
      ...prev,
      [currentPageId]: { ...prev[currentPageId], title: newTitle }
    }));
    
    setPages(prev => prev.map(p => 
      p.id === currentPageId ? { ...p, title: newTitle } : p
    ));
  };

  const handleBlocksChange = (newBlocks: Block[]) => {
    if (!currentPage) return;
    
    setPageData(prev => ({
      ...prev,
      [currentPageId]: { ...prev[currentPageId], blocks: newBlocks }
    }));
  };

  return (
    <div className="flex min-h-screen bg-background font-inter">
      <Sidebar
        pages={pages}
        currentPageId={currentPageId}
        onPageSelect={handlePageSelect}
        onPageCreate={handlePageCreate}
        onPageDelete={handlePageDelete}
        onPageRename={handlePageRename}
      />
      
      {currentPage ? (
        <Editor
          title={currentPage.title}
          blocks={currentPage.blocks}
          onTitleChange={handleTitleChange}
          onBlocksChange={handleBlocksChange}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-editor-bg">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-text-primary mb-2">No page selected</h2>
            <p className="text-text-secondary">Select a page from the sidebar to start editing</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
