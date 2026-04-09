import React, { createContext, useState, useContext, useEffect, useRef, useMemo, useCallback } from 'react';
import apiService from '../services/api';
import { useSocket } from './SocketContext';

const PostContext = createContext();

export function PostProvider({ children }) {
  const [posts, setPosts] = useState([]);

  const socket = useSocket();
  const debounceRef = useRef(null);

  // 초기 로드 (백그라운드)
  useEffect(() => {
    apiService.fetchPosts().catch(() => []).then(data => {
      if (data?.length > 0) setPosts(data);
    });
  }, []);

  // 소켓: posts:updated
  useEffect(() => {
    if (!socket) return;

    const handlePostsUpdated = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          const data = await apiService.fetchPosts();
          if (data) setPosts(data);
        } catch (e) {}
      }, 300);
    };

    socket.on('posts:updated', handlePostsUpdated);
    return () => socket.off('posts:updated', handlePostsUpdated);
  }, [socket]);

  // 앱 복귀 시 갱신
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await apiService.fetchPosts();
        if (data) setPosts(data);
      } catch (e) {}
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const addPost = useCallback(async (postData) => {
    const post = await apiService.createPost(postData);
    setPosts(prev => [post, ...prev]);
    return post;
  }, []);

  const updatePost = useCallback(async (postId, updates) => {
    const post = await apiService.updatePost(postId, updates);
    setPosts(prev => prev.map(p => p.id === postId ? post : p));
    return post;
  }, []);

  const deletePost = useCallback(async (postId) => {
    await apiService.deletePost(postId);
    setPosts(prev => prev.filter(p => p.id !== postId));
  }, []);

  const refreshPosts = useCallback(async () => {
    try {
      const data = await apiService.fetchPosts();
      if (data) setPosts(data);
    } catch (e) {}
  }, []);

  const value = useMemo(() => ({
    posts,
    addPost,
    updatePost,
    deletePost,
    refreshPosts,
  }), [posts, addPost, updatePost, deletePost, refreshPosts]);

  return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
}

export function usePost() {
  const ctx = useContext(PostContext);
  if (!ctx) throw new Error('usePost must be used within PostProvider');
  return ctx;
}
