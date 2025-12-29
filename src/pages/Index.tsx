import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sidebar, type Page as SidebarPage } from "@/components/Sidebar";
import { Editor, type Block as EditorBlock } from "@/components/Editor";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TemplateSelector, type TemplateType } from "@/components/TemplateSelector";
import { SaveIndicator } from "@/components/SaveIndicator";
import { SidebarSkeleton } from "@/components/SidebarSkeleton";
import { EditorSkeleton } from "@/components/EditorSkeleton";
import { FileText } from "lucide-react";
import { useAutoSave } from "@/hooks/useAutoSave";
import { usePages, useCreatePage, useUpdatePage, useDeletePage, useReorderPages, useUpdatePageParent } from "@/hooks/usePages";
import { useBlocks, useCreateBlock, useUpdateBlock, useBatchUpdateBlocks, type Block as DBBlock } from "@/hooks/useBlocks";
import { useCreateVersion } from "@/hooks/useVersions";
import { useToast } from "@/hooks/use-toast";
import { usePageHierarchy } from "@/hooks/usePageHierarchy";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { SaveAsTemplateButton } from "@/components/SaveAsTemplateButton";
import { WorkspaceSelector } from "@/components/WorkspaceSelector";
import { VersionHistory } from "@/components/VersionHistory";
import { ExportDropdown } from "@/components/ExportDropdown";
import { NotificationCenter } from "@/components/NotificationCenter";
import { ActiveUsers } from "@/components/UserCursor";
import { PageProperties } from "@/components/PageProperties";
import { DatabaseViewComponent } from "@/components/database/DatabaseView";
import { useCanEdit, useCanDelete } from "@/hooks/usePermissions";
import { usePresence } from "@/hooks/usePresence";
import { History, Settings, X, Database, Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localBlocks, setLocalBlocks] = useState<EditorBlock[]>([]);
  const [expandedPageIds, setExpandedPageIds] = useState<Set<string>>(new Set());
  const [newPageParentId, setNewPageParentId] = useState<string | null>(null);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'editor' | 'database'>('editor');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Permissions
  const canEdit = useCanEdit(currentWorkspaceId);
  const canDelete = useCanDelete(currentWorkspaceId);
  
  // Presence
  const { activeUsers } = usePresence(currentPageId, currentWorkspaceId);
  
  // Fetch data from Lovable Cloud
  const { data: pages = [], isLoading: pagesLoading } = usePages(currentWorkspaceId);
  const { data: currentBlocks = [], isLoading: blocksLoading } = useBlocks(currentPageId);
  
  // Mutations
  const createPageMutation = useCreatePage();
  const createBlockMutation = useCreateBlock();
  const updatePageMutation = useUpdatePage();
  const deletePageMutation = useDeletePage();
  const reorderPagesMutation = useReorderPages();
  const updatePageParentMutation = useUpdatePageParent();
  const batchUpdateBlocksMutation = useBatchUpdateBlocks();
  const createVersionMutation = useCreateVersion();

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

  // Track last version creation time
  const lastVersionTimeRef = useRef<number>(0);
  const VERSION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

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

      // Create version snapshot every 5 minutes
      const now = Date.now();
      if (now - lastVersionTimeRef.current > VERSION_INTERVAL_MS) {
        try {
          await createVersionMutation.mutateAsync({
            pageId: currentPageId,
            title: localTitle,
            blocks: localBlocks,
          });
          lastVersionTimeRef.current = now;
        } catch (error) {
          // Silently fail version creation - don't interrupt save
          logger.warn('Failed to create version snapshot:', error);
        }
      }
    },
  });

  // Load expanded pages from localStorage on mount
  useEffect(() => {
    if (user?.id) {
      const storageKey = `notion-expanded-pages-${user.id}`;
      const savedExpanded = localStorage.getItem(storageKey);
      if (savedExpanded) {
        try {
          const expandedArray = JSON.parse(savedExpanded);
          setExpandedPageIds(new Set(expandedArray));
        } catch (error) {
          logger.warn('Failed to parse expanded pages from localStorage:', error);
        }
      }
    }
  }, [user?.id]);

  // Save expanded pages to localStorage when they change
  useEffect(() => {
    if (user?.id && expandedPageIds.size > 0) {
      const storageKey = `notion-expanded-pages-${user.id}`;
      const expandedArray = Array.from(expandedPageIds);
      localStorage.setItem(storageKey, JSON.stringify(expandedArray));
    }
  }, [expandedPageIds, user?.id]);

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
          workspace_id: currentWorkspaceId,
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
      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={cn(
        isMobile ? 'fixed' : 'relative',
        isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0',
        'z-50 transition-transform duration-300',
        isMobile ? 'w-80' : 'w-64'
      )}>
        <Sidebar
        pages={sidebarPages}
        currentPageId={currentPageId || ""}
        onPageSelect={handlePageSelect}
        onPageCreate={canEdit ? handlePageCreate : undefined}
        onPageDelete={canDelete ? handlePageDelete : undefined}
        onPageRename={canEdit ? handlePageRename : undefined}
        onPageReorder={canEdit ? handlePageReorder : undefined}
        onToggleFavorite={handleToggleFavorite}
        onUpdatePageParent={canEdit ? handleUpdatePageParent : undefined}
        expandedPageIds={expandedPageIds}
        onToggleExpand={handleToggleExpand}
        allPages={pages}
        workspaceId={currentWorkspaceId || undefined}
      />

      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-14 border-b border-border-light bg-background flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2 md:gap-4">
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="h-9 w-9 p-0"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <WorkspaceSelector
              currentWorkspaceId={currentWorkspaceId || undefined}
              onWorkspaceChange={setCurrentWorkspaceId}
            />
            <Breadcrumbs
              currentPageId={currentPageId || ""}
              pages={sidebarPages}
              onPageSelect={(pageId) => handleSearchPageSelect(pageId)}
            />
          </div>
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
            <SaveIndicator
              status={titleAutoSave.status === "idle" ? blocksAutoSave.status : titleAutoSave.status}
              lastSaved={titleAutoSave.lastSaved || blocksAutoSave.lastSaved}
            />
            {activeUsers.length > 0 && (
              <ActiveUsers users={activeUsers} />
            )}
            <div className="flex items-center border border-border rounded-md">
              <Button
                variant={viewMode === 'editor' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('editor')}
                className="rounded-r-none"
              >
                Editor
              </Button>
              <Button
                variant={viewMode === 'database' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('database')}
                className="rounded-l-none border-l"
              >
                <Database className="h-4 w-4 mr-2" />
                Banco de Dados
              </Button>
            </div>
            {currentPage && canEdit && (
              <SaveAsTemplateButton
                title={localTitle}
                blocks={localBlocks}
                disabled={localBlocks.length === 0}
              />
            )}
            {currentPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVersionHistoryOpen(true)}
                className="h-9 px-3"
              >
                <History className="h-4 w-4 mr-2" />
                Histórico
              </Button>
            )}
            {currentPage && canEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPropertiesOpen(true)}
                className="h-9 px-3"
              >
                <Settings className="h-4 w-4 mr-2" />
                Propriedades
              </Button>
            )}
            <ExportDropdown
              title={localTitle}
              blocks={localBlocks}
              onImport={(title, blocks) => {
                setLocalTitle(title);
                setLocalBlocks(blocks);
              }}
            />
            <NotificationCenter />
            <ThemeToggle />
            <GlobalSearch
              onPageSelect={handleSearchPageSelect}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
        {viewMode === 'database' ? (
          <DatabaseViewComponent
            workspaceId={currentWorkspaceId || undefined}
            onPageSelect={(pageId) => {
              setCurrentPageId(pageId);
              setViewMode('editor');
            }}
            onAddPage={() => handlePageCreate()}
            className="flex-1 bg-editor-bg"
          />
        ) : currentPage && !blocksLoading ? (
          <Editor
            title={localTitle}
            blocks={localBlocks}
            onTitleChange={handleTitleChange}
            onBlocksChange={handleBlocksChange}
            pageId={currentPageId || undefined}
            workspaceId={currentWorkspaceId || undefined}
            readonly={!canEdit}
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
        
        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50 md:hidden">
            <div className="flex items-center justify-around h-14">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="flex flex-col items-center gap-1 h-full"
              >
                <Menu className="h-4 w-4" />
                <span className="text-xs">Páginas</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('editor')}
                className={cn(
                  "flex flex-col items-center gap-1 h-full",
                  viewMode === 'editor' && "text-primary"
                )}
              >
                <FileText className="h-4 w-4" />
                <span className="text-xs">Editor</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('database')}
                className={cn(
                  "flex flex-col items-center gap-1 h-full",
                  viewMode === 'database' && "text-primary"
                )}
              >
                <Database className="h-4 w-4" />
                <span className="text-xs">Dados</span>
              </Button>
            </div>
          </div>
        )}
      </div>

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />

      {/* Properties Modal */}
      {isPropertiesOpen && currentPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border-light">
              <h2 className="text-lg font-semibold text-text-primary">
                Propriedades da Página
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPropertiesOpen(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <PageProperties
                pageId={currentPageId || undefined}
                workspaceId={currentWorkspaceId || undefined}
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {isVersionHistoryOpen && currentPage && (
        <VersionHistory
          isOpen={isVersionHistoryOpen}
          onClose={() => setIsVersionHistoryOpen(false)}
          pageId={currentPageId || ""}
          pageTitle={localTitle}
        />
      )}
    </div>
  );
};

export default Index;
