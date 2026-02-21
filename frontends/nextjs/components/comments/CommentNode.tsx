"use client";

import { useState } from "react";
import { deleteComment, updateComment } from "@/lib/api/comments";
import { voteOnComment } from "@/lib/api/votes";
import { useUsername } from "@/lib/context/UsernameContext";
import type { CommentResponse } from "@/lib/api/types";
import type { CommentNode as CommentNodeType } from "@/lib/api/treeUtils";
import { VoteButtons } from "@/components/votes/VoteButtons";
import { CommentForm } from "./CommentForm";
import { LoadMoreReplies } from "./LoadMoreReplies";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type Props = {
  postId: string;
  comment: CommentNodeType;
};

export function CommentNode({ postId, comment }: Props) {
  const { username } = useUsername();
  const isAuthor = !!username && username === comment.author;

  const [deleted, setDeleted] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editDraft, setEditDraft] = useState(comment.body);
  const [editedBody, setEditedBody] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  const [newReplies, setNewReplies] = useState<CommentNodeType[]>([]);
  const [extraReplies, setExtraReplies] = useState<CommentNodeType[]>([]);
  const [replyCursor, setReplyCursor] = useState<string | undefined>();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    setDeleting(true);
    try {
      await deleteComment(postId, comment.id);
      setDeleted(true);
    } catch {
      setDeleting(false);
    }
  };

  const handleEdit = async () => {
    if (!editDraft.trim() || editDraft === editedBody) {
      setShowEditForm(false);
      return;
    }
    setSaving(true);
    try {
      await updateComment(postId, comment.id, { body: editDraft.trim() });
      setEditedBody(editDraft.trim());
      setShowEditForm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleVote = async (value: -1 | 0 | 1) => {
    if (!username) return;
    await voteOnComment(postId, comment.id, { username, value });
  };

  const handleReplyAdded = (reply: CommentResponse) => {
    setNewReplies((prev) => [...prev, { ...reply, replies: [] }]);
    setShowReplyForm(false);
  };

  const handleMoreRepliesLoaded = (
    items: CommentResponse[],
    nextCursor?: string,
  ) => {
    setExtraReplies((prev) => [
      ...prev,
      ...items.map((r) => ({ ...r, replies: [] })),
    ]);
    setReplyCursor(nextCursor);
  };

  const allReplies: CommentNodeType[] = [
    ...comment.replies,
    ...extraReplies,
    ...newReplies,
  ];

  if (deleted) {
    return <p className="text-sm italic text-gray-400">[deleted]</p>;
  }

  return (
    <div id={comment.id}>
      <div className="flex flex-col gap-2">
        {/* Header */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {comment.author}
          </span>
          <span>·</span>
          <span>{formatDate(comment.created_at)}</span>
          {comment.updated_at !== comment.created_at && (
            <>
              <span>·</span>
              <span>edited</span>
            </>
          )}
        </div>

        {/* Body or inline edit form */}
        {showEditForm ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              rows={3}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
            />
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={saving || !editDraft.trim()}
                className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => {
                  setEditDraft(editedBody);
                  setShowEditForm(false);
                }}
                className="rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
            {editedBody}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3">
          <VoteButtons
            score={comment.vote_score}
            onVote={handleVote}
            disabled={!username}
          />
          <button
            onClick={() => setShowReplyForm((s) => !s)}
            className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {showReplyForm ? "Cancel" : "Reply"}
          </button>
          {isAuthor && (
            <>
              <button
                onClick={() => {
                  setEditDraft(editedBody);
                  setShowEditForm((s) => !s);
                  setShowReplyForm(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                {showEditForm ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50 dark:text-red-400"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <CommentForm
            postId={postId}
            parentCommentId={comment.id}
            onCommentAdded={handleReplyAdded}
            onCancel={() => setShowReplyForm(false)}
          />
        )}
      </div>

      {/* Nested replies */}
      {allReplies.length > 0 && (
        <div className="ml-1 mt-3 flex flex-col gap-3 border-l border-gray-200 pl-3 dark:border-gray-800">
          {allReplies.map((reply) => (
            <CommentNode
              key={reply.id}
              postId={postId}
              comment={reply}
            />
          ))}
        </div>
      )}

      {/* Load more replies */}
      {replyCursor && (
        <div className="mt-2">
          <LoadMoreReplies
            postId={postId}
            commentId={comment.id}
            cursor={replyCursor}
            onLoaded={handleMoreRepliesLoaded}
          />
        </div>
      )}
    </div>
  );
}
