export type PostResponse = {
  id: string;
  title?: string;
  body: string;
  author: string;
  created_at: string;
  updated_at: string;
  vote_score: number;
};

export type PostListResponse = {
  items: PostResponse[];
  next_cursor?: string;
};

export type CommentResponse = {
  id: string;
  post_id: string;
  parent_comment_id?: string;
  author: string;
  body: string;
  created_at: string;
  updated_at: string;
  vote_score: number;
  depth?: number;
  replies?: CommentResponse[];
};

export type CommentTreeResponse = {
  items: CommentResponse[];
  next_cursor?: string;
};

export type VoteRequest = {
  username: string;
  value: -1 | 0 | 1;
};

export type VoteResponse = {
  object_id: string;
  object_type: string;
  vote_score: number;
};
