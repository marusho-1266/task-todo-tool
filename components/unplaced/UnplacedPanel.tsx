"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { Todo } from "@/lib/types";

type Props = {
  todos: Todo[];
  rolledOverTodos?: Todo[];
};

export function UnplacedPanel({ todos, rolledOverTodos = [] }: Props) {
  if (todos.length === 0 && rolledOverTodos.length === 0) return null;

  return (
    <aside
      className="flex w-full shrink-0 flex-col border-l lg:w-[30%] lg:max-w-xs"
      style={{
        borderColor: "var(--color-rule)",
        background: "var(--color-paper-2)",
      }}
    >
      <header
        className="border-b px-4 py-3"
        style={{ borderColor: "var(--color-rule)" }}
      >
        <h2
          className="text-sm font-medium"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
        >
          未配置
        </h2>
        <p
          className="mt-0.5 text-xs"
          style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
        >
          タイムラインへドラッグして配置
        </p>
      </header>
      <Droppable droppableId="unplaced">
        {(provided, snapshot) => (
          <ul
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex flex-1 flex-col gap-2 overflow-y-auto p-3"
            style={{
              minHeight: 120,
              background: snapshot.isDraggingOver
                ? "var(--color-accent-soft)"
                : undefined,
            }}
          >
            {todos.map((todo, index) => (
              <Draggable key={todo.id} draggableId={todo.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <li
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    className="rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm shadow-sm"
                    style={{
                      ...dragProvided.draggableProps.style,
                      borderColor: dragSnapshot.isDragging
                        ? "var(--color-accent)"
                        : "var(--color-rule)",
                      background: "var(--color-paper)",
                      fontFamily: "var(--font-body)",
                      color: "var(--color-ink)",
                    }}
                  >
                    <span className="block font-medium">
                      {todo.tasks?.title ?? "（無題）"}
                    </span>
                    <span
                      className="mt-0.5 block text-xs"
                      style={{ color: "var(--color-ink-muted)" }}
                    >
                      {todo.planned_minutes}分 · 配置後に計測可
                    </span>
                  </li>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>

      {rolledOverTodos.length > 0 && (
        <div
          className="border-t px-3 py-3"
          style={{ borderColor: "var(--color-rule)" }}
        >
          <h3
            className="mb-2 text-xs font-medium uppercase tracking-wider"
            style={{ color: "var(--color-ink-faint)", fontFamily: "var(--font-body)" }}
          >
            繰越済（未配置）
          </h3>
          <ul className="flex flex-col gap-2">
            {rolledOverTodos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-[var(--radius-sm)] border border-dashed px-3 py-2.5 text-sm opacity-60"
                style={{
                  borderColor: "var(--color-plan-border)",
                  background: "color-mix(in srgb, var(--color-plan) 8%, transparent)",
                  fontFamily: "var(--font-body)",
                  color: "var(--color-ink-muted)",
                }}
              >
                <span className="block font-medium">
                  {todo.tasks?.title ?? "（無題）"}
                </span>
                <span
                  className="mt-0.5 block text-xs"
                  style={{ color: "var(--color-ink-faint)" }}
                >
                  {todo.planned_minutes}分 · 明日へ繰越済
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
