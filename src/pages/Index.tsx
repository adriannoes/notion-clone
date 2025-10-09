import { useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar, type Page as SidebarPage } from "@/components/Sidebar";
import { Editor, type Block as EditorBlock } from "@/components/Editor";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TemplateSelector, type TemplateType } from "@/components/TemplateSelector";
import { SaveIndicator } from "@/components/SaveIndicator";
import { SidebarSkeleton } from "@/components/SidebarSkeleton";
import { EditorSkeleton } from "@/components/EditorSkeleton";
import { useAutoSave } from "@/hooks/useAutoSave";
import { usePages, useCreatePage, useUpdatePage, useDeletePage, useReorderPages, useUpdatePageParent } from "@/hooks/usePages";
import { useBlocks, useCreateBlock, useUpdateBlock, useBatchUpdateBlocks, type Block as DBBlock } from "@/hooks/useBlocks";
import { useToast } from "@/hooks/use-toast";
import { usePageHierarchy } from "@/hooks/usePageHierarchy";

// Convert DB blocks to Editor blocks
const dbBlockToEditorBlock = (block: DBBlock): EditorBlock => ({
  id: block.id,
  type: block.type as EditorBlock['type'],
  content: block.content || "",
  metadata: typeof block.metadata === 'object' ? block.metadata as Record<string, any> : {},
  children: [],
});

const Index = () => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localBlocks, setLocalBlocks] = useState<EditorBlock[]>([]);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(new Set());
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch data from Lovable Cloud
  const { data: pages = [], isLoading: pagesLoading } = usePages();
  const { data: currentBlocks = [], isLoading: blocksLoading } = useBlocks(currentPageId);
  
  // Mutations
  const createPageMutation = useCreatePage();
  const createBlockMutation = useCreateBlock();
  const updatePageMutation = useUpdatePage();
  const deletePageMutation = useDeletePage();
  const reorderPagesMutation = useReorderPages();
  const updatePageParentMutation = useUpdatePageParent();
  const batchUpdateBlocksMutation = useBatchUpdateBlocks();

  // Get current page
  const currentPage = pages.find(p => p.id === currentPageId);

  // Initialize local state when current page/blocks change
  useEffect(() => {
    if (currentPage) {
      setLocalTitle(currentPage.title);
    }
  }, [currentPage]);

  useEffect(() => {
    if (currentBlocks.length > 0) {
      setLocalBlocks(currentBlocks.map(dbBlockToEditorBlock));
    } else {
      setLocalBlocks([]);
    }
  }, [currentBlocks]);

  // Auto-save for title
  const titleAutoSave = useAutoSave({
    onSave: async () => {
      if (!currentPageId || !localTitle) return;
      await updatePageMutation.mutateAsync({
        id: currentPageId,
        updates: { title: localTitle },
      });
    },
  });

  // Auto-save for blocks
  const blocksAutoSave = useAutoSave({
    onSave: async () => {
      if (!currentPageId || localBlocks.length === 0) return;
      
      // Convert EditorBlock[] to BlockUpdate[] with position
      const blockUpdates = localBlocks.map((block, index) => ({
        id: block.id,
        updates: {
          type: block.type,
          content: block.content,
          metadata: block.metadata || {},
          position: index,
        },
      }));
      
      await batchUpdateBlocksMutation.mutateAsync({
        blocks: blockUpdates,
        pageId: currentPageId,
      });
    },
  });

  // Set initial page when pages load
  useEffect(() => {
    if (!currentPageId && pages.length > 0) {
      const welcomePage = pages.find(p => p.title.includes("Welcome")) || pages[0];
      setCurrentPageId(welcomePage.id);
      setLocalTitle(welcomePage.title);
    }
  }, [pages, currentPageId]);

  const handlePageSelect = useCallback((page: SidebarPage) => {
    setCurrentPageId(page.id);
    setLocalTitle(page.title);
  }, []);

  const handlePageCreate = useCallback((parentId?: string) => {
    setNewPageParentId(parentId || null);
    setShowTemplateSelector(true);
  }, []);

  const handleTemplateSelect = useCallback(
    async (template: TemplateType, blocks: EditorBlock[]) => {
      const templateTitles: Record<TemplateType, string> = {
        blank: "Sem título",
        todo: "Lista de Tarefas",
        meeting: "Notas de Reunião",
        code: "Documentação de Código",
        brainstorm: "Brainstorm",
      };

      try {
        // Create page in database
        const result = await createPageMutation.mutateAsync({
          title: templateTitles[template],
          position: pages.length,
          parent_id: newPageParentId,
        });

        // Create blocks for the new page
        if (result && blocks.length > 0) {
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            await createBlockMutation.mutateAsync({
              page_id: result.id,
              type: block.type,
              content: block.content,
              metadata: block.metadata || {},
              position: i,
            });
          }
        }

        setCurrentPageId(result.id);
        setLocalTitle(result.title);
        setShowTemplateSelector(false);
        setNewPageParentId(null);

        toast({
          title: "Página criada",
          description: `${templateTitles[template]} foi criada com sucesso.`,
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível criar a página.",
          variant: "destructive",
        });
      }
    },
    [pages, createPageMutation, createBlockMutation, queryClient, toast]
  );

  const handlePageDelete = useCallback(
    async (pageId: string) => {
      // Optimistic update
      queryClient.setQueryData(["pages"], (old: any[]) =>
        old.filter((p: any) => p.id !== pageId)
      );

      try {
        await deletePageMutation.mutateAsync(pageId);

        if (currentPageId === pageId) {
          const remainingPages = pages.filter(p => p.id !== pageId);
          if (remainingPages.length > 0) {
            setCurrentPageId(remainingPages[0].id);
            setLocalTitle(remainingPages[0].title);
          } else {
            setCurrentPageId(null);
            setLocalTitle("");
          }
        }
      } catch (error) {
        // Revert on error
        queryClient.invalidateQueries({ queryKey: ["pages"] });
      }
    },
    [currentPageId, pages, deletePageMutation, queryClient]
  );

  const handlePageRename = useCallback(
    async (pageId: string, newTitle: string) => {
      // Optimistic update
      queryClient.setQueryData(["pages"], (old: any[]) =>
        old.map((p: any) => (p.id === pageId ? { ...p, title: newTitle } : p))
      );

      try {
        await updatePageMutation.mutateAsync({
          id: pageId,
          updates: { title: newTitle },
        });
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ["pages"] });
      }
    },
    [updatePageMutation, queryClient]
  );

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setLocalTitle(newTitle);
      titleAutoSave.triggerSave();
    },
    [titleAutoSave]
  );

  const handleBlocksChange = useCallback(
    (newBlocks: EditorBlock[]) => {
      setLocalBlocks(newBlocks);
      blocksAutoSave.triggerSave();
    },
    [blocksAutoSave]
  );

  const handlePageReorder = useCallback(
    async (newPages: SidebarPage[]) => {
      // Optimistic update
      queryClient.setQueryData(["pages"], newPages);

      try {
        const updates = newPages.map((page, index) => ({
          id: page.id,
          position: index,
        }));
        await reorderPagesMutation.mutateAsync(updates);
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ["pages"] });
      }
    },
    [reorderPagesMutation, queryClient]
  );

  const handleToggleFavorite = useCallback(
    async (pageId: string) => {
      const page = pages.find(p => p.id === pageId);
      if (!page) return;

      // Optimistic update
      queryClient.setQueryData(["pages"], (old: any[]) =>
        old.map((p: any) =>
          p.id === pageId ? { ...p, is_favorite: !p.is_favorite } : p
        )
      );

      try {
        await updatePageMutation.mutateAsync({
          id: pageId,
          updates: { is_favorite: !page.is_favorite },
        });
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ["pages"] });
      }
    },
    [pages, updatePageMutation, queryClient]
  );

  const handleSearchPageSelect = useCallback((pageId: string) => {
    setCurrentPageId(pageId);
    const page = pages.find(p => p.id === pageId);
    if (page) {
      setLocalTitle(page.title);
    }
  }, [pages]);

  const handleToggleExpand = useCallback((pageId: string) => {
    setExpandedPageIds(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
  }, []);

  const handleUpdatePageParent = useCallback(
    async (pageId: string, newParentId: string | null) => {
      // Optimistic update
      queryClient.setQueryData(["pages"], (old: any[]) =>
        old.map((p: any) =>
          p.id === pageId ? { ...p, parent_id: newParentId } : p
        )
      );

      try {
        await updatePageParentMutation.mutateAsync({ pageId, newParentId });
      } catch (error) {
        queryClient.invalidateQueries({ queryKey: ["pages"] });
      }
    },
    [updatePageParentMutation, queryClient]
  );

  // Use hierarchy hook
  const hierarchicalPages = usePageHierarchy(pages, expandedPageIds);

  // Show loading state
  if (pagesLoading) {
    return (
      <div className="flex min-h-screen bg-background font-inter">
        <SidebarSkeleton />
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border-light bg-background" />
          <EditorSkeleton />
        </div>
      </div>
    );
  }

  // Convert pages to sidebar format with hierarchy
  const sidebarPages: SidebarPage[] = hierarchicalPages.map(p => ({
    id: p.id,
    title: p.title,
    isExpanded: expandedPageIds.has(p.id),
    isFavorite: p.is_favorite || false,
    level: p.level,
    hasChildren: p.children.length > 0,
    parent_id: p.parent_id,
  }));

  return (
    <div className="flex min-h-screen bg-background font-inter">
      <Sidebar
        pages={sidebarPages}
        currentPageId={currentPageId || ""}
        onPageSelect={handlePageSelect}
        onPageCreate={handlePageCreate}
        onPageDelete={handlePageDelete}
        onPageRename={handlePageRename}
        onPageReorder={handlePageReorder}
        onToggleFavorite={handleToggleFavorite}
        onUpdatePageParent={handleUpdatePageParent}
        expandedPageIds={expandedPageIds}
        onToggleExpand={handleToggleExpand}
        allPages={pages}
      />

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border-light bg-background flex items-center justify-between px-6">
          <Breadcrumbs
            currentPageId={currentPageId || ""}
            pages={sidebarPages}
            onPageSelect={(pageId) => handleSearchPageSelect(pageId)}
          />
          <div className="flex items-center gap-4">
            <SaveIndicator
              status={titleAutoSave.status === "idle" ? blocksAutoSave.status : titleAutoSave.status}
              lastSaved={titleAutoSave.lastSaved || blocksAutoSave.lastSaved}
            />
            <GlobalSearch
              onPageSelect={handleSearchPageSelect}
            />
          </div>
        </div>

        {/* Editor */}
        {currentPage && !blocksLoading ? (
          <Editor
            title={localTitle}
            blocks={localBlocks}
            onTitleChange={handleTitleChange}
            onBlocksChange={handleBlocksChange}
          />
        ) : blocksLoading ? (
          <EditorSkeleton />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-editor-bg">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-text-primary mb-2">
                Nenhuma página selecionada
              </h2>
              <p className="text-text-secondary">
                Selecione uma página na barra lateral para começar a editar
              </p>
            </div>
          </div>
        )}
      </div>

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
};

export default Index;
