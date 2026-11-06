'use client';

import { useState, useEffect, useCallback } from 'react';

export interface UseAdminToolsOptions {
  platform: 'web' | 'mobile';
  /** showAlert function from layout (Mobile uses CustomAlert, could differ) */
  showAlert: (message: string, title?: string) => void;
  alertConfig?: { show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void };
  setAlertConfig?: React.Dispatch<React.SetStateAction<{ show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void }>>;
  fetchRooms: (token: string) => Promise<void>;
  rooms: any[];
  selectedChat: any | null;
  setSelectedChat: (chat: any | null) => void;
  setMessages: (messages: any[]) => void;
}

export function useAdminTools(options: UseAdminToolsOptions) {
  const { platform, showAlert, fetchRooms, selectedChat, setSelectedChat, setMessages } = options;

  // ── Stats ──
  const [totalUsersCount, setTotalUsersCount] = useState<number>(12540);
  const [networkLatency, setNetworkLatency] = useState<number>(24);

  // ── AI Auto-Response State ──
  // ⚠️  DISABLE: Comment baris ini untuk balik ke toggle lokal saja
  const [isInfoActive, setIsInfoActive] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false); // Loading state saat toggle
  const [showAIConfirm, setShowAIConfirm] = useState(false); // Konfirmasi sebelum toggle AI
  const [pendingAIState, setPendingAIState] = useState(false); // State AI yang akan diaktifkan
  // ─────────────────────────────────────────────────────────────────────────

  // ── Bless Chat ──
  const [showBlessModal, setShowBlessModal] = useState(false);
  const [blessMessage, setBlessMessage] = useState('');
  const [blessFile, setBlessFile] = useState<{ name: string, data: string, type: string } | null>(null);
  const [blessTargetMode, setBlessTargetMode] = useState<'waiting_room' | 'all_users' | 'specific_users'>('waiting_room');
  const [allUsers, setAllUsers] = useState<{ username: string, gmail: string }[]>([]);
  const [selectedBlessUsers, setSelectedBlessUsers] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isBlasting, setIsBlasting] = useState(false);

  // ── Bulk Delete ──
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<number[]>([]);

  // ── Alert Config (shared) ──
  const [internalAlertConfig, setInternalAlertConfig] = useState<{ show: boolean, type: 'alert' | 'confirm', message: string, title?: string, onConfirm?: () => void }>({ show: false, type: 'alert', message: '' });
  const alertConfig = options.alertConfig ?? internalAlertConfig;
  const setAlertConfig = options.setAlertConfig ?? setInternalAlertConfig;

  // ── Fetch Stats ──
  const fetchStats = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/stats`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok) {
        setTotalUsersCount(data.total_users || 0);
      }
    } catch (err) {
      console.error("Gagal ambil stats:", err);
    }
  }, []);

  // ── Fetch All Users ──
  const fetchAllUsers = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/users`, {
        headers: { 'Authorization': token }
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Gagal ambil semua user:", err);
    }
  }, []);

  // ── AI Auto-Response Functions ───────────────────────────────────────────
  // ⚠️  DISABLE: Comment seluruh blok fetchAIStatus + handleToggleAI di bawah ini

  const fetchAIStatus = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai/status`, {
        headers: { 'Authorization': token }
      });
      if (res.ok) {
        const data = await res.json();
        setIsInfoActive(data.enabled === true);
      }
    } catch (err) {
      console.warn('[AI] Tidak bisa ambil status AI (ML service mungkin belum jalan):', err);
    }
  }, []);

  const handleToggleAI = useCallback(async (newState: boolean) => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token } = JSON.parse(storedUser);

    setIsInfoActive(newState);
    setIsAILoading(true);
    setShowAIConfirm(false);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ai/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify({ enabled: newState })
      });
      if (!res.ok) {
        setIsInfoActive(!newState);
        console.error('[AI] Gagal toggle AI');
      }
    } catch (err) {
      setIsInfoActive(!newState);
      console.warn('[AI] Koneksi ke backend gagal:', err);
    } finally {
      setIsAILoading(false);
    }
  }, []);

  const handleAIToggleRequest = useCallback((newState: boolean) => {
    setPendingAIState(newState);
    setShowAIConfirm(true);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  // ── Bless Chat Handler ──
  const handleBlessChat = useCallback(async () => {
    if (!blessMessage.trim() && !blessFile) return;
    if (blessTargetMode === 'specific_users' && selectedBlessUsers.length === 0) {
      showAlert('Pilih minimal satu user tujuan!', 'Pilih User');
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const { token, gmail } = JSON.parse(storedUser);

    setIsBlasting(true);
    try {
      const payload = {
        message: blessMessage,
        admin_gmail: gmail,
        file_data: blessFile ? `${blessFile.name}|${blessFile.data}` : '',
        file_type: blessFile ? blessFile.type : 'text',
        target_type: blessTargetMode,
        target_gmails: blessTargetMode === 'specific_users' ? selectedBlessUsers : []
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showAlert('Berhasil mengirim pesan Bless Chat!', 'Sukses');
        setBlessMessage('');
        setBlessFile(null);
        setSelectedBlessUsers([]);
        setShowBlessModal(false);
        fetchRooms(token);
      }
    } catch (err) {
      console.error("Gagal kirim Bless Chat:", err);
    } finally {
      setIsBlasting(false);
    }
  }, [blessMessage, blessFile, blessTargetMode, selectedBlessUsers, showAlert, fetchRooms]);

  // ── Bulk Delete Handler ──
  const handleBulkDelete = useCallback(async (_filteredRooms?: any[]) => {
    if (selectedRooms.length === 0) return;

    setAlertConfig({
      show: true,
      type: 'confirm',
      message: `Lu yakin mau hapus ${selectedRooms.length} room chat ini secara permanen? Data gak bakal bisa balik lagi lho bro!`,
      title: 'Hapus Room Chat',
      onConfirm: async () => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) return;
        const { token } = JSON.parse(storedUser);

        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/chat/delete-bulk`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token
            },
            body: JSON.stringify({ room_ids: selectedRooms })
          });

          if (res.ok) {
            showAlert('Mantap! Room chat pilihan lu udah bersih dari database.', 'Sukses');
            setSelectedRooms([]);
            setIsDeleteMode(false);
            if (platform === 'web' && selectedChat && selectedRooms.includes(selectedChat.id)) {
              setSelectedChat(null);
              setMessages([]);
            }
            fetchRooms(token);
          } else {
            const data = await res.json();
            showAlert('Gagal hapus: ' + data.error, 'Gagal');
          }
        } catch (err) {
          console.error("Gagal bulk delete:", err);
          showAlert('Ada kendala koneksi pas mau hapus data bro.', 'Error Koneksi');
        }
      }
    });
  }, [selectedRooms, platform, selectedChat, setSelectedChat, setMessages, showAlert, fetchRooms, setAlertConfig]);

  const toggleSelectRoom = useCallback((id: number) => {
    setSelectedRooms(prev =>
      prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
    );
  }, []);

  const toggleSelectAll = useCallback((filteredRooms: any[]) => {
    if (selectedRooms.length === filteredRooms.length) {
      setSelectedRooms([]);
    } else {
      setSelectedRooms(filteredRooms.map(r => r.id));
    }
  }, [selectedRooms]);

  // ── Latency polling ──
  useEffect(() => {
    const updateLatency = () => {
      // @ts-expect-error navigator.connection is not standard in TS DOM lib
      const rtt = navigator.connection?.rtt || Math.floor(Math.random() * (40 - 15 + 1)) + 15;
      setNetworkLatency(rtt);
    };
    updateLatency();
    const interval = setInterval(updateLatency, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    // Stats
    totalUsersCount, setTotalUsersCount,
    networkLatency,
    fetchStats,
    // AI
    isInfoActive, setIsInfoActive,
    isAILoading,
    showAIConfirm, setShowAIConfirm,
    pendingAIState,
    handleToggleAI,
    handleAIToggleRequest,
    fetchAIStatus,
    // Bless Chat
    showBlessModal, setShowBlessModal,
    blessMessage, setBlessMessage,
    blessFile, setBlessFile,
    blessTargetMode, setBlessTargetMode,
    allUsers,
    selectedBlessUsers, setSelectedBlessUsers,
    userSearchQuery, setUserSearchQuery,
    isBlasting,
    handleBlessChat,
    fetchAllUsers,
    // Bulk Delete
    isDeleteMode, setIsDeleteMode,
    selectedRooms, setSelectedRooms,
    handleBulkDelete,
    toggleSelectRoom,
    toggleSelectAll,
    // Alert
    alertConfig, setAlertConfig,
  };
}
