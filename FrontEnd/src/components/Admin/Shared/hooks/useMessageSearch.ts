'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Message } from '@/constants/chatTypes';

export function useMessageSearch(messages: Message[]) {
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isLocalSearchOpen, setIsLocalSearchOpen] = useState(false);
  const [searchMatchIndex, setSearchMatchIndex] = useState<number>(0);

  const searchMatches = useMemo(() => {
    return messages
      ? messages.filter(m => localSearchQuery.trim() && m.text.toLowerCase().includes(localSearchQuery.toLowerCase()))
      : [];
  }, [messages, localSearchQuery]);

  useEffect(() => {
    if (localSearchQuery.trim()) {
      setSearchMatchIndex(searchMatches.length > 0 ? 1 : 0);
    } else {
      setSearchMatchIndex(0);
    }
  }, [localSearchQuery, messages]);

  const scrollToMatch = useCallback((index: number) => {
    if (index > 0 && searchMatches[index - 1]) {
      const matchMsg = searchMatches[index - 1];
      const el = document.getElementById(`msg-${matchMsg.id || matchMsg.timestamp}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [searchMatches]);

  return {
    localSearchQuery,
    setLocalSearchQuery,
    isLocalSearchOpen,
    setIsLocalSearchOpen,
    searchMatchIndex,
    setSearchMatchIndex,
    searchMatches,
    scrollToMatch,
  };
}
