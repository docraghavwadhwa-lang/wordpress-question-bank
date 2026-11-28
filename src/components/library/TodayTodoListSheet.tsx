import React, { useState, useEffect } from "react";
import {
  fetchStudyTodos,
  addStudyTodo,
  toggleStudyTodo,
  deleteStudyTodo,
  saveStudyTodosOrder,
  formatTodoDateGroupLabel,
  type StudyTodo,
} from "@/lib/library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ListTodo,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface TodayTodoListSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function TodayTodoListSheet({
  isOpen,
  onClose,
  currentUserId,
}: TodayTodoListSheetProps) {
  const [todos, setTodos] = useState<StudyTodo[]>([]);
  const [newTodoText, setNewTodoText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadTodos = async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const data = await fetchStudyTodos(currentUserId);
      setTodos(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && currentUserId) {
      void loadTodos();
    }
  }, [isOpen, currentUserId]);

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim() || !currentUserId) return;
    const task = newTodoText.trim();
    setNewTodoText("");
    try {
      const created = await addStudyTodo(currentUserId, task);
      setTodos((prev) => [created, ...prev]);
      toast.success("Task added");
    } catch {
      toast.error("Could not add task");
    }
  };

  const handleToggleTodo = async (todoId: string, completed: boolean) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === todoId ? { ...t, completed } : t))
    );
    try {
      await toggleStudyTodo(todoId, completed);
    } catch {
      setTodos((prev) =>
        prev.map((t) => (t.id === todoId ? { ...t, completed: !completed } : t))
      );
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== todoId));
    try {
      await deleteStudyTodo(todoId);
      toast.info("Task removed");
    } catch {
      /* ignore */
    }
  };

  const handleMoveTodo = (index: number, direction: "up" | "down") => {
    const todayItems = [...todayTodos];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= todayItems.length) return;

    const temp = todayItems[index];
    const target = todayItems[targetIndex];
    if (!temp || !target) return;
    todayItems[index] = target;
    todayItems[targetIndex] = temp;

    const orderedIds = todayItems.map((t) => t.id);
    saveStudyTodosOrder(currentUserId, orderedIds);
    setTodos([...todayItems, ...olderTodos]);
  };

  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayTodos = todos.filter((t) => {
    const createdDate = t.created_at ? t.created_at.split("T")[0] : todayDateStr;
    return createdDate === todayDateStr;
  });
  const olderTodos = todos.filter((t) => {
    const createdDate = t.created_at ? t.created_at.split("T")[0] : todayDateStr;
    return createdDate !== todayDateStr;
  });

  const olderGroupsMap = new Map<string, StudyTodo[]>();
  olderTodos.forEach((t) => {
    const label = formatTodoDateGroupLabel(t.created_at);
    if (!olderGroupsMap.has(label)) {
      olderGroupsMap.set(label, []);
    }
    olderGroupsMap.get(label)?.push(t);
  });
  const olderDateGroups = Array.from(olderGroupsMap.entries()).map(([label, items]) => ({
    label,
    items,
  }));

  const doneToday = todayTodos.filter((t) => t.completed).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#082428] border border-[#0D4347] text-[#F7F5F0] p-6 shadow-2xl rounded-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="text-left pb-3 border-b border-[#0D4347]">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-[#E5B95C] font-display text-lg flex items-center gap-2">
              <ListTodo className="h-5 w-5" /> Today's To Do List
            </DialogTitle>
            <span className="text-xs text-[#F7F5F0]/70 font-mono">
              {doneToday} / {todayTodos.length} done
            </span>
          </div>
        </DialogHeader>

        <form onSubmit={handleAddTodo} className="flex gap-2 my-2">
          <Input
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Add a task (e.g. Revise General Pathology PYQs)..."
            className="h-9 text-xs bg-[#0D4347]/60 border-[#0D4347] text-[#F7F5F0] placeholder:text-[#F7F5F0]/40"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newTodoText.trim()}
            className="h-9 px-3 bg-[#E5B95C] text-[#082428] font-bold hover:bg-[#E5B95C]/90 shadow-sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
          {loading && todos.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#F7F5F0]/60">Loading tasks...</div>
          ) : todayTodos.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#F7F5F0]/50 space-y-1">
              <p>No tasks planned for today yet.</p>
              <p className="text-[11px] text-[#F7F5F0]/40">Add your core medical revision items above.</p>
            </div>
          ) : (
            todayTodos.map((todo, idx) => (
              <div
                key={todo.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-[#0D4347]/40 border border-[#0D4347] p-2.5 text-xs hover:bg-[#0D4347]/60 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleToggleTodo(todo.id, !todo.completed)}
                  className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                >
                  {todo.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981] shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-[#F7F5F0]/40 shrink-0" />
                  )}
                  <span
                    className={`truncate font-medium ${
                      todo.completed ? "line-through text-[#F7F5F0]/40" : "text-[#F7F5F0]"
                    }`}
                  >
                    {todo.task}
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMoveTodo(idx, "up")}
                    className="p-1 text-[#F7F5F0]/40 hover:text-[#E5B95C] disabled:opacity-20"
                    title="Move up"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === todayTodos.length - 1}
                    onClick={() => handleMoveTodo(idx, "down")}
                    className="p-1 text-[#F7F5F0]/40 hover:text-[#E5B95C] disabled:opacity-20"
                    title="Move down"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-1 text-[#F7F5F0]/40 hover:text-red-400 ml-1"
                    title="Delete task"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}

          {olderDateGroups.length > 0 && (
            <div className="pt-3 mt-3 border-t border-[#0D4347] space-y-2.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-[#E5B95C]">
                Previous Tasks
              </p>
              {olderDateGroups.map((grp) => (
                <div key={grp.label} className="space-y-1.5">
                  <p className="text-[10px] text-[#F7F5F0]/50 font-mono">📅 {grp.label}</p>
                  {grp.items.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-[#0D4347]/20 p-2 text-xs text-[#F7F5F0]/70"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTodo(todo.id, !todo.completed)}
                        className="flex items-center gap-2 text-left min-w-0 flex-1 cursor-pointer"
                      >
                        {todo.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-[#F7F5F0]/40 shrink-0" />
                        )}
                        <span className={todo.completed ? "line-through text-[#F7F5F0]/40 truncate" : "truncate"}>
                          {todo.task}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTodo(todo.id)}
                        className="text-[#F7F5F0]/30 hover:text-red-400 p-1"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
