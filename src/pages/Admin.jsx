import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import CrownIcon from '../components/CrownIcon';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import SearchableDropdown from '../components/SearchableDropdown';
import PageHeader from '../components/common/PageHeader';

function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addFee, courses, addCourse, refreshMembers, refreshCourses, members: contextMembers, clubLogo, updateClubLogo } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
  const [showLedger, setShowLedger] = useState(() => localStorage.getItem('devShowLedger') === 'true');
  const [members, setMembers] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [showPermissionMenu, setShowPermissionMenu] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const menuRefs = useRef({});
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    maleHolePars: Array(18).fill(''),
    femaleHolePars: Array(18).fill(''),
    nearHoles: Array(18).fill(false),
    isCompetition: false
  });
  const [showNewMemberForm, setShowNewMemberForm] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    nickname: '',
    phone: '',
    club: '',
    handicap: '',
    golflinkNumber: '',
    clubMemberNumber: '',
    photo: '',
    gender: '',
    birthYear: '',
    region: '',
    isClubMember: '',
    isAdmin: false
  });
  const [editingMember, setEditingMember] = useState(null);
  const [editMemberData, setEditMemberData] = useState(null);
  const [showCourseMenu, setShowCourseMenu] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editCourseData, setEditCourseData] = useState(null);
  const courseMenuRefs = useRef({});
  const [clubSearchInput, setClubSearchInput] = useState('');
  const [clubAiState, setClubAiState] = useState('idle'); // 'idle'|'searching'|'done'|'error'
  const [courseSheetOpen, setCourseSheetOpen] = useState(false);
  const [courseSheetMode, setCourseSheetMode] = useState('add'); // 'add' | 'edit'
  const [courseSearchQuery, setCourseSearchQuery] = useState('');
  const [courseListSearch, setCourseListSearch] = useState('');
  const [courseSearchState, setCourseSearchState] = useState('idle'); // 'idle'|'searching'|'found'|'error'
  const [courseSearchResult, setCourseSearchResult] = useState(null);
  const [showScoreModal, setShowScoreModal] = useState(null);
  const [scoreFormData, setScoreFormData] = useState({
    roundingName: '',
    date: '',
    courseName: '',
    totalScore: ''
  });
  const [memberScores, setMemberScores] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [approvalRequired, setApprovalRequired] = useState(false);
  const [pickWinnerEnabled, setPickWinnerEnabled] = useState(true);
  const [squadFormationRules, setSquadFormationRules] = useState({ 정기모임: true, 컴페티션: true, 캐주얼: false });
  const [approvalPermission, setApprovalPermission] = useState('관리자');
  
  const [clubBalance, setClubBalance] = useState(0);
  const [outstandingBalances, setOutstandingBalances] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [transactionForm, setTransactionForm] = useState({
    type: 'charge',
    amount: '',
    description: '',
    memberId: '',
    date: new Date().toISOString().split('T')[0]
  });
  
  const [allTransactions, setAllTransactions] = useState([]);
  const [ledgerFilter, setLedgerFilter] = useState({
    type: 'all',
    memberId: 'all',
    showCharges: false
  });
  const [summaryBookingFilter, setSummaryBookingFilter] = useState('all');
  const [selectedSummaryCategories, setSelectedSummaryCategories] = useState([]);
  const [isTransactionSelectMode, setIsTransactionSelectMode] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [ledgerCurrentPage, setLedgerCurrentPage] = useState(1);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [ledgerStats, setLedgerStats] = useState({ income: {}, expense: {} });
  const [ledgerBookings, setLedgerBookings] = useState([]);
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [isUpdatingTransaction, setIsUpdatingTransaction] = useState(false);

  const [incomeCategories, setIncomeCategories] = useState([]);
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [newIncomeCategoryName, setNewIncomeCategoryName] = useState('');
  const [newExpenseCategoryName, setNewExpenseCategoryName] = useState('');

  const [clubTab, setClubTab] = useState('income');
  const [bookings, setBookings] = useState([]);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedIncome, setSelectedIncome] = useState({
    categoryId: '',
    bookingId: null,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    manualName: ''
  });
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedGuests, setSelectedGuests] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState({
    categoryId: '',
    bookingId: null,
    memberId: null,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    memo: '',
    receiptImage: ''
  });
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(null);
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const [isProcessingIncome, setIsProcessingIncome] = useState(false);
  const [isProcessingExpense, setIsProcessingExpense] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(null);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [paymentGuideText, setPaymentGuideText] = useState('');
  const [savedPaymentGuideText, setSavedPaymentGuideText] = useState('');
  const [kakaoOpenChatUrl, setKakaoOpenChatUrl] = useState('');
  const [savedKakaoOpenChatUrl, setSavedKakaoOpenChatUrl] = useState('');
  const [clubIntroText, setClubIntroText] = useState('');
  const [savedClubIntroText, setSavedClubIntroText] = useState('');
  const [clubRulesText, setClubRulesText] = useState('');
  const [savedClubRulesText, setSavedClubRulesText] = useState('');
  const [appDescriptionText, setAppDescriptionText] = useState('');
  const [savedAppDescriptionText, setSavedAppDescriptionText] = useState('');
  
  // 스코어 관리 상태
  const [scoreManagementView, setScoreManagementView] = useState('rounds'); // 'rounds', 'memberScores', 'leaderboard', 'scorecard', 'allScores', 'memberScoreInput'
  const [showCompetitionRoundings, setShowCompetitionRoundings] = useState(false); // 클럽 컴페티션 표시 여부
  const [allScoresData, setAllScoresData] = useState([]);
  const [selectedScoreIds, setSelectedScoreIds] = useState([]);
  const [selectedRoundForScore, setSelectedRoundForScore] = useState(null);
  const [pendingScoreBookingId, setPendingScoreBookingId] = useState(null);
  const [selectedPlayerForScore, setSelectedPlayerForScore] = useState(null);
  const [roundScores, setRoundScores] = useState([]);
  const [editingScore, setEditingScore] = useState(null);
  const [editScoreData, setEditScoreData] = useState(null);
  const [isLoadingRoundScores, setIsLoadingRoundScores] = useState(false);
  
  // 회원별 스코어 관리 상태
  const [selectedMemberForScore, setSelectedMemberForScore] = useState(null);
  const [memberScoreBooking, setMemberScoreBooking] = useState(null);
  const [memberScoreData, setMemberScoreData] = useState({ totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
  const [isSavingMemberScore, setIsSavingMemberScore] = useState(false);
  const [memberSearchText, setMemberSearchText] = useState('');
  const [existingMemberScore, setExistingMemberScore] = useState(null);
  const [showScoreMenu, setShowScoreMenu] = useState(false);

  const [activityLogs, setActivityLogs] = useState([]);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [isLoadingActivityLogs, setIsLoadingActivityLogs] = useState(false);

  const features = [
    { id: 'create_rounding', name: '라운딩 생성' },
    { id: 'edit_rounding', name: '라운딩 수정/삭제' },
    { id: 'team_formation', name: '조편성' },
    { id: 'participant_management', name: '참가자 관리' },
    { id: 'score_entry', name: '스코어 입력' },
    { id: 'fee_management', name: '클럽회계관리' },
    { id: 'delete_transaction', name: '거래내역 삭제' },
    { id: 'course_management', name: '골프장 관리' },
    { id: 'manage_board', name: '게시판 관리' },
    { id: 'member_approval', name: '회원 승인' },
    { id: 'fee_exemption', name: '참가비 면제선택' },
    { id: 'pick_winner', name: '우승자 맞추기' }
  ];

  useEffect(() => {
    if (location.state?.reset) {
      setActiveTab('menu');
      window.history.replaceState({}, document.title);
    }
    if (location.state?.openScoreBookingId) {
      const bookingId = location.state.openScoreBookingId;
      setActiveTab('scoreManagement');
      setScoreManagementView('rounds');
      setPendingScoreBookingId(bookingId);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (!pendingScoreBookingId || bookings.length === 0) return;
    const target = bookings.find(b => b.id === pendingScoreBookingId);
    if (!target) return;
    setPendingScoreBookingId(null);
    setSelectedRoundForScore(target);
    setScoreManagementView('leaderboard');
    setIsLoadingRoundScores(true);
    setRoundScores([]);
    const dateStr = new Date(target.date).toISOString().split('T')[0];
    fetch(`/api/scores/booking/${encodeURIComponent(dateStr)}/${encodeURIComponent(target.courseName)}`)
      .then(res => res.json())
      .then(data => setRoundScores(Array.isArray(data) ? data : []))
      .catch(() => setRoundScores([]))
      .finally(() => setIsLoadingRoundScores(false));
  }, [pendingScoreBookingId, bookings]);

  useEffect(() => {
    if (contextMembers) {
      setMembers(prev => {
        const hasPhotos = prev.some(m => m.photo);
        if (hasPhotos) {
          return prev.map(pm => {
            const updated = contextMembers.find(cm => cm.id === pm.id);
            return updated ? { ...updated, photo: pm.photo } : pm;
          });
        }
        return contextMembers;
      });
    }
  }, [contextMembers]);

  useEffect(() => {
    if (activeTab === 'members') {
      const hasPhotos = members.some(m => m.photo);
      if (!hasPhotos) {
        apiService.fetchMembersWithPhotos().then(data => {
          if (data) setMembers(data);
        }).catch(() => {});
      }
    }
  }, [activeTab]);

  useEffect(() => {
    loadPermissions();
  }, []);

  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'developer') {
      loadCategories();
    }
    if (activeTab === 'developer') {
      loadActivityLogs();
    }
    if (activeTab === 'fees') {
      loadFeeDataFast();
    }
    if (activeTab === 'ledger') {
      loadLedgerData();
      loadBookingsForScoreManagement();
    }
    if (activeTab === 'scoreManagement') {
      loadBookingsForScoreManagement();
    }
    if (activeTab === 'clubFinance') {
      loadBookingsForScoreManagement();
    }
  }, [activeTab]);

  const bookingsLoadedRef = useRef(false);
  const loadBookingsForScoreManagement = async (forceRefresh = false) => {
    if (bookingsLoadedRef.current && bookings.length > 0 && !forceRefresh) {
      return;
    }
    try {
      const bookingsData = await apiService.fetchBookings();
      setBookings(bookingsData || []);
      bookingsLoadedRef.current = true;
    } catch (error) {
      console.error('라운딩 데이터 로드 실패:', error);
    }
  };

  const loadPermissions = async () => {
    try {
      const settings = await apiService.fetchSettings();
      const permissionsObj = {};
      settings.forEach(setting => {
        permissionsObj[setting.feature] = setting.minRole;
        if (setting.feature === 'memberApprovalRequired') {
          setApprovalRequired(setting.enabled || false);
        }
        if (setting.feature === 'pickWinnerEnabled') {
          setPickWinnerEnabled(setting.enabled !== false);
        }
        if (setting.feature === 'squadFormationRules' && setting.value) {
          try { setSquadFormationRules(JSON.parse(setting.value)); } catch {}
        }
        if (setting.feature === 'member_approval') {
          setApprovalPermission(setting.minRole || '관리자');
        }
        if (setting.feature === 'paymentGuideText') {
          setPaymentGuideText(setting.value || '');
          setSavedPaymentGuideText(setting.value || '');
        }
        if (setting.feature === 'clubIntroText') {
          setClubIntroText(setting.value || '');
          setSavedClubIntroText(setting.value || '');
        }
        if (setting.feature === 'clubRulesText') {
          setClubRulesText(setting.value || '');
          setSavedClubRulesText(setting.value || '');
        }
        if (setting.feature === 'appDescriptionText') {
          setAppDescriptionText(setting.value || '');
          setSavedAppDescriptionText(setting.value || '');
        }
        if (setting.feature === 'kakaoOpenChatUrl') {
          setKakaoOpenChatUrl(setting.value || '');
          setSavedKakaoOpenChatUrl(setting.value || '');
        }
      });
      
      features.forEach(feature => {
        if (!permissionsObj[feature.id]) {
          permissionsObj[feature.id] = '관리자';
        }
      });
      
      setPermissions(permissionsObj);
    } catch (error) {
      console.error('권한 설정 로드 실패:', error);
    }
  };

  const loadFeeDataFast = async () => {
    try {
      // 1단계: 캐시된 항목 즉시 표시 (비어있는 캐시는 무시)
      const cachedIncome = sessionStorage.getItem('incomeCategories');
      const cachedExpense = sessionStorage.getItem('expenseCategories');
      const cachedBookings = sessionStorage.getItem('feeBookings');
      const parsedCachedIncome = cachedIncome ? JSON.parse(cachedIncome) : null;
      const parsedCachedExpense = cachedExpense ? JSON.parse(cachedExpense) : null;

      if (parsedCachedIncome?.length > 0) setIncomeCategories(parsedCachedIncome);
      if (parsedCachedExpense?.length > 0) setExpenseCategories(parsedCachedExpense);
      if (cachedBookings) setBookings(JSON.parse(cachedBookings));

      // 2단계: 중요한 데이터만 먼저 로드 (빠른 표시)
      const [balanceData, outstandingData] = await Promise.all([
        apiService.fetchClubBalance(),
        apiService.fetchOutstandingBalances()
      ]);

      setClubBalance(balanceData.balance);
      setOutstandingBalances(outstandingData);

      // 3단계: 나머지 데이터 백그라운드 로드 (라운딩은 항상 최신 데이터)
      const [transactionsResponse, incomeCats, expenseCats, bookingsData] = await Promise.all([
        apiService.fetchTransactions({ limit: 50 }),
        (parsedCachedIncome?.length > 0) ? Promise.resolve(parsedCachedIncome) : apiService.fetchIncomeCategories(),
        (parsedCachedExpense?.length > 0) ? Promise.resolve(parsedCachedExpense) : apiService.fetchExpenseCategories(),
        apiService.fetchBookings() // 항상 최신 라운딩 데이터 가져오기
      ]);
      
      const transactionsData = transactionsResponse?.transactions || transactionsResponse || [];
      // 거래 내역에 누적 클럽 잔액 계산
      let runningBalance = 0;
      const transactionsWithBalance = (Array.isArray(transactionsData) ? transactionsData : []).reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense' || t.type === 'credit') {
          runningBalance -= t.amount;
        }
        return { ...t, clubBalance: runningBalance };
      }).reverse();
      
      setRecentTransactions(transactionsWithBalance);
      setIncomeCategories(incomeCats || []);
      setExpenseCategories(expenseCats || []);
      setBookings(bookingsData || []);
      
      // 캐시 저장 (변경 가능성 있는 항목만)
      if (!cachedIncome || JSON.stringify(incomeCats) !== cachedIncome) {
        sessionStorage.setItem('incomeCategories', JSON.stringify(incomeCats));
      }
      if (!cachedExpense || JSON.stringify(expenseCats) !== cachedExpense) {
        sessionStorage.setItem('expenseCategories', JSON.stringify(expenseCats));
      }
      if (!cachedBookings || JSON.stringify(bookingsData) !== cachedBookings) {
        sessionStorage.setItem('feeBookings', JSON.stringify(bookingsData));
      }
    } catch (error) {
      console.error('회비 데이터 로드 실패:', error);
    }
  };

  const loadFeeData = async () => {
    try {
      const [balanceData, outstandingData, transactionsResponse, incomeCats, expenseCats, bookingsData] = await Promise.all([
        apiService.fetchClubBalance(),
        apiService.fetchOutstandingBalances(),
        apiService.fetchTransactions({ limit: 50 }),
        apiService.fetchIncomeCategories(),
        apiService.fetchExpenseCategories(),
        apiService.fetchBookings()
      ]);
      const transactionsData = transactionsResponse?.transactions || transactionsResponse || [];
      setClubBalance(balanceData.balance);
      setOutstandingBalances(outstandingData);
      setRecentTransactions((Array.isArray(transactionsData) ? transactionsData : []).slice(0, 10));
      setIncomeCategories(incomeCats || []);
      setExpenseCategories(expenseCats || []);
      setBookings(bookingsData || []);
    } catch (error) {
      console.error('회비 데이터 로드 실패:', error);
    }
  };

  const refreshBalanceAndOutstanding = async () => {
    try {
      const [balanceData, outstandingData] = await Promise.all([
        apiService.fetchClubBalance(),
        apiService.fetchOutstandingBalances()
      ]);
      setClubBalance(balanceData.balance);
      setOutstandingBalances(outstandingData);
    } catch (error) {
      console.error('잔액 데이터 새로고침 실패:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const [income, expense] = await Promise.all([
        apiService.fetchIncomeCategories(),
        apiService.fetchExpenseCategories()
      ]);
      setIncomeCategories(income);
      setExpenseCategories(expense);
      sessionStorage.setItem('incomeCategories', JSON.stringify(income));
      sessionStorage.setItem('expenseCategories', JSON.stringify(expense));
    } catch (error) {
      console.error('항목 로드 실패:', error);
    }
  };

  const loadActivityLogs = async () => {
    setIsLoadingActivityLogs(true);
    try {
      const [logs, online] = await Promise.all([
        apiService.fetchActivityLogs(50),
        apiService.fetchOnlineMembers()
      ]);
      setActivityLogs(logs || []);
      setOnlineMembers(online || []);
    } catch (error) {
      console.error('활동 로그 로드 실패:', error);
    } finally {
      setIsLoadingActivityLogs(false);
    }
  };

  const getDeviceType = (userAgent) => {
    if (!userAgent) return 'Unknown';
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(ua)) {
      return 'Mobile';
    }
    return 'Desktop';
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const handleAddIncomeCategory = async () => {
    if (!newIncomeCategoryName.trim()) {
      alert('항목명을 입력해주세요.');
      return;
    }
    try {
      await apiService.createIncomeCategory(newIncomeCategoryName.trim());
      setNewIncomeCategoryName('');
      await loadCategories();
      alert('입금항목이 추가되었습니다.');
    } catch (error) {
      console.error('입금항목 추가 실패:', error);
      alert('입금항목 추가에 실패했습니다.');
    }
  };

  const handleDeleteIncomeCategory = async (id) => {
    if (!confirm('정말 이 입금항목을 삭제하시겠습니까?')) return;
    try {
      await apiService.deleteIncomeCategory(id);
      await loadCategories();
      alert('입금항목이 삭제되었습니다.');
    } catch (error) {
      console.error('입금항목 삭제 실패:', error);
      alert('입금항목 삭제에 실패했습니다.');
    }
  };

  const handleAddExpenseCategory = async () => {
    if (!newExpenseCategoryName.trim()) {
      alert('항목명을 입력해주세요.');
      return;
    }
    try {
      await apiService.createExpenseCategory(newExpenseCategoryName.trim());
      setNewExpenseCategoryName('');
      await loadCategories();
      alert('출금항목이 추가되었습니다.');
    } catch (error) {
      console.error('출금항목 추가 실패:', error);
      alert('출금항목 추가에 실패했습니다.');
    }
  };

  const handleDeleteExpenseCategory = async (id) => {
    if (!confirm('정말 이 출금항목을 삭제하시겠습니까?')) return;
    try {
      await apiService.deleteExpenseCategory(id);
      await loadCategories();
      alert('출금항목이 삭제되었습니다.');
    } catch (error) {
      console.error('출금항목 삭제 실패:', error);
      alert('출금항목 삭제에 실패했습니다.');
    }
  };

  const handleOpenIncomeModal = () => {
    if (!selectedIncome.categoryId) {
      alert('입금항목을 선택해주세요.');
      return;
    }
    setSelectedMembers([]);
    setSelectedGuests([]);
    setShowIncomeModal(true);
  };

  const handleCloseIncomeModal = () => {
    setShowIncomeModal(false);
    setSelectedMembers([]);
    setSelectedGuests([]);
  };

  const getGuestsFromBooking = () => {
    if (!selectedIncome.bookingId) return [];
    const selectedBooking = bookings.find(b => b.id === selectedIncome.bookingId);
    if (!selectedBooking) return [];
    
    const participantData = selectedBooking.participants || [];
    const guests = [];
    
    participantData.forEach(p => {
      let participant = p;
      if (typeof p === 'string') {
        try {
          participant = JSON.parse(p);
        } catch (e) {
          return;
        }
      }
      if (participant?.isGuest) {
        guests.push({
          phone: participant.phone,
          name: participant.name || participant.nickname || '게스트',
          memberNumber: participant.memberNumber || ''
        });
      }
    });
    
    return guests;
  };

  const handleToggleGuest = (guestPhone) => {
    setSelectedGuests(prev => 
      prev.includes(guestPhone) 
        ? prev.filter(phone => phone !== guestPhone)
        : [...prev, guestPhone]
    );
  };

  const handleOpenRefundModal = () => {
    const category = expenseCategories.find(c => c.id === selectedExpense.categoryId);
    if (category?.name !== '환불' && category?.name !== '회원 크레딧') {
      return;
    }
    setShowRefundModal(true);
  };

  const handleCloseRefundModal = () => {
    setShowRefundModal(false);
    setIsProcessingRefund(false);
  };

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const getSortedMembers = () => {
    const allMembers = contextMembers || members || [];
    const activeMembers = allMembers.filter(m => m.isActive);
    
    if (!selectedIncome.bookingId) {
      return activeMembers;
    }

    const selectedBooking = bookings.find(b => b.id === selectedIncome.bookingId);
    
    if (!selectedBooking) {
      return activeMembers;
    }

    const participantData = selectedBooking.participants || [];
    const participantPhones = participantData.map(p => {
      if (typeof p === 'string') {
        try {
          const parsed = JSON.parse(p);
          return parsed.phone;
        } catch (e) {
          return p;
        }
      }
      return p?.phone || p;
    });
    
    const participants = activeMembers.filter(m => participantPhones.includes(m.phone));
    const nonParticipants = activeMembers.filter(m => !participantPhones.includes(m.phone));
    
    return [...participants, ...nonParticipants];
  };

  const handleToggleAllMembers = () => {
    const allMembers = contextMembers || members || [];
    const sortedMembers = getSortedMembers();
    const selectedBooking = bookings.find(b => b.id === selectedIncome.bookingId);
    const guests = getGuestsFromBooking();
    
    if (selectedIncome.bookingId && selectedBooking) {
      const participantData = selectedBooking.participants || [];
      const participantPhones = participantData.map(p => {
        if (typeof p === 'string') {
          try {
            const parsed = JSON.parse(p);
            return parsed.phone;
          } catch (e) {
            return p;
          }
        }
        return p?.phone || p;
      });
      
      const participantMembers = allMembers.filter(m => m.isActive && participantPhones.includes(m.phone));
      const totalSelected = selectedMembers.length + selectedGuests.length;
      const totalParticipants = participantMembers.length + guests.length;
      
      if (totalSelected === totalParticipants && 
          participantMembers.every(m => selectedMembers.includes(m.id)) &&
          guests.every(g => selectedGuests.includes(g.phone))) {
        setSelectedMembers([]);
        setSelectedGuests([]);
      } else {
        setSelectedMembers(participantMembers.map(m => m.id));
        setSelectedGuests(guests.map(g => g.phone));
      }
    } else {
      if (selectedMembers.length === sortedMembers.length) {
        setSelectedMembers([]);
      } else {
        setSelectedMembers(sortedMembers.map(m => m.id));
      }
      setSelectedGuests([]);
    }
  };

  const handleProcessIncome = async () => {
    try {
      if (!selectedIncome.categoryId || !selectedIncome.amount) {
        alert('입금항목과 금액을 입력해주세요.');
        return;
      }

      const category = incomeCategories.find(c => c.id === selectedIncome.categoryId);
      const booking = bookings.find(b => b.id === selectedIncome.bookingId);
      const isDonation = category?.name === '도네이션';

      // 수동 입력 이름이 있는 경우
      if (selectedIncome.manualName && selectedIncome.manualName.trim()) {
        const transactionData = {
          type: isDonation ? 'donation' : 'payment',
          amount: parseFloat(selectedIncome.amount),
          description: `${category?.name}${booking ? ` - ${booking.courseName}` : ''} (${selectedIncome.manualName.trim()})`,
          date: selectedIncome.date,
          memberId: null,
          bookingId: selectedIncome.bookingId || null,
          createdBy: user.id
        };
        
        await apiService.createTransaction(transactionData);
        alert(`${selectedIncome.manualName.trim()}님의 ${isDonation ? '도네이션' : '입금'}이 클럽 잔고에 추가되었습니다.`);
      } 
      // 회원 또는 게스트 선택이 있는 경우
      else if (selectedMembers.length > 0 || selectedGuests.length > 0) {
        const transactionPromises = [];
        let totalCreditUsed = 0;
        
        // 회원 거래 처리
        for (const memberId of selectedMembers) {
          const member = members.find(m => m.id === memberId);
          const description = `${category?.name}${isDonation ? '' : '청구'}${booking ? ` - ${booking.courseName}` : ''}${isDonation ? ` (${member.nickname || member.name})` : ''}`;
          
          if (isDonation) {
            const transactionData = {
              type: 'donation',
              amount: parseFloat(selectedIncome.amount),
              description: description,
              date: selectedIncome.date,
              memberId: memberId,
              bookingId: selectedIncome.bookingId || null,
              createdBy: user.id
            };
            transactionPromises.push(apiService.createTransaction(transactionData));
          } else {
            const chargeData = {
              memberId: memberId,
              amount: parseFloat(selectedIncome.amount),
              description: description,
              date: selectedIncome.date,
              bookingId: selectedIncome.bookingId || null,
              createdBy: user.id
            };
            transactionPromises.push(
              apiService.createChargeWithCredit(chargeData).then(result => {
                if (result.creditUsed > 0) {
                  totalCreditUsed += result.creditUsed;
                }
                return result;
              })
            );
          }
        }
        
        // 게스트 거래 처리 (memberId 없이 payment 타입으로 클럽 잔액에만 반영)
        const guests = getGuestsFromBooking();
        selectedGuests.forEach(guestPhone => {
          const guest = guests.find(g => g.phone === guestPhone);
          if (guest) {
            const transactionData = {
              type: 'payment',
              amount: parseFloat(selectedIncome.amount),
              description: `${category?.name}${booking ? ` - ${booking.courseName}` : ''} (외부게스트: ${guest.name})`,
              date: selectedIncome.date,
              memberId: null,
              bookingId: selectedIncome.bookingId || null,
              createdBy: user.id
            };
            transactionPromises.push(apiService.createTransaction(transactionData));
          }
        });

        await Promise.all(transactionPromises);

        const totalCount = selectedMembers.length + selectedGuests.length;
        if (isDonation) {
          alert(`${selectedMembers.length}명의 회원 도네이션이 클럽 잔고에 추가되었습니다.`);
        } else {
          let message = '';
          if (selectedMembers.length > 0) {
            message += `${selectedMembers.length}명의 회원에게 참가비가 청구되었습니다.`;
            if (totalCreditUsed > 0) {
              message += `\n(크레딧 $${totalCreditUsed.toLocaleString()} 자동 차감됨)`;
            }
          }
          if (selectedGuests.length > 0) {
            if (message) message += '\n';
            message += `${selectedGuests.length}명의 외부게스트 납부가 클럽 잔고에 추가되었습니다.`;
          }
          alert(message);
        }
      } else {
        alert('회원 또는 게스트를 선택하거나 이름을 수동으로 입력해주세요.');
        return;
      }
      
      handleCloseIncomeModal();
      setSelectedIncome({
        categoryId: '',
        bookingId: null,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        manualName: ''
      });
      
      // 거래 내역 포함 전체 데이터 새로고침
      await Promise.all([
        refreshBalanceAndOutstanding(),
        refreshMembers ? refreshMembers() : Promise.resolve()
      ]);
      
      // 최근 거래 내역 다시 불러오기
      const transactionsResponse = await apiService.fetchTransactions({ limit: 50 });
      const transactionsData = transactionsResponse?.transactions || transactionsResponse || [];
      let runningBalance = 0;
      const transactionsWithBalance = (Array.isArray(transactionsData) ? transactionsData : []).reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense' || t.type === 'credit') {
          runningBalance -= t.amount;
        }
        return { ...t, clubBalance: runningBalance };
      }).reverse();
      setRecentTransactions(transactionsWithBalance);
    } catch (error) {
      console.error('입금 처리 실패:', error);
      alert('입금 처리에 실패했습니다.');
    }
  };

  const handleClubExpense = async () => {
    try {
      if (!selectedExpense.categoryId || !selectedExpense.amount) {
        alert('출금항목과 금액을 입력해주세요.');
        return;
      }

      const category = expenseCategories.find(c => c.id === selectedExpense.categoryId);
      
      // 환불 또는 회원 크레딧인 경우 회원 선택 필수
      if ((category?.name === '환불' || category?.name === '회원 크레딧') && !selectedExpense.memberId) {
        const actionText = category?.name === '회원 크레딧' ? '크레딧을 받을' : '환불받을';
        alert(`${actionText} 회원을 선택해주세요.`);
        return;
      }

      const booking = bookings.find(b => b.id === selectedExpense.bookingId);
      const member = members.find(m => m.id === selectedExpense.memberId);
      const isRefundOrCredit = category?.name === '환불' || category?.name === '회원 크레딧';
      
      const transactionData = {
        type: isRefundOrCredit ? 'credit' : 'expense',
        amount: parseFloat(selectedExpense.amount),
        category: category?.name,
        memo: selectedExpense.memo || null,
        description: category?.name,
        date: selectedExpense.date,
        memberId: isRefundOrCredit ? selectedExpense.memberId : null,
        bookingId: selectedExpense.bookingId || null,
        receiptImage: selectedExpense.receiptImage || null,
        createdBy: user.id
      };

      await apiService.createTransaction(transactionData);
      
      setSelectedExpense({
        categoryId: '',
        bookingId: null,
        memberId: null,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        memo: '',
        receiptImage: ''
      });
      
      // 병렬로 데이터 새로고침
      const [transactionsResponse] = await Promise.all([
        apiService.fetchTransactions({ limit: 50 }),
        refreshBalanceAndOutstanding()
      ]);
      
      const transactionsData = transactionsResponse?.transactions || transactionsResponse || [];
      let runningBalance = 0;
      const transactionsWithBalance = (Array.isArray(transactionsData) ? transactionsData : []).reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense' || t.type === 'credit') {
          runningBalance -= t.amount;
        }
        return { ...t, clubBalance: runningBalance };
      }).reverse();
      setRecentTransactions(transactionsWithBalance);
      
      return true;
    } catch (error) {
      console.error('출금 처리 실패:', error);
      alert('출금 처리에 실패했습니다.');
      return false;
    }
  };

  const handleFullPayment = async (memberId, amount) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      // 회원의 가장 최근 charge 거래에서 bookingId와 카테고리 찾기
      const memberTransactions = await apiService.fetchMemberTransactions(memberId);
      const recentCharge = memberTransactions.find(t => t.type === 'charge' && t.booking);
      const bookingId = recentCharge?.booking?.id || null;
      
      // 청구 설명에서 카테고리 추출 (예: "회식비청구 - ..." -> "회식비")
      let categoryName = '참가비';
      if (recentCharge?.description) {
        const chargeDesc = recentCharge.description;
        if (chargeDesc.includes('청구')) {
          categoryName = chargeDesc.split('청구')[0];
        }
      }

      const transactionData = {
        type: 'payment',
        amount: Math.abs(amount),
        description: '회비납부',
        date: new Date().toISOString().split('T')[0],
        memberId: memberId,
        bookingId: bookingId,
        createdBy: user.id
      };

      await apiService.createTransaction(transactionData);
      alert(`${member.nickname || member.name}님의 회비가 납부 처리되었습니다.`);
      
      // 거래 내역 포함 전체 데이터 새로고침
      await Promise.all([
        refreshBalanceAndOutstanding(),
        refreshMembers ? refreshMembers() : Promise.resolve()
      ]);
      
      // 최근 거래 내역 다시 불러오기
      const transactionsResponse = await apiService.fetchTransactions({ limit: 50 });
      const transactionsData = transactionsResponse?.transactions || transactionsResponse || [];
      let runningBalance = 0;
      const transactionsWithBalance = (Array.isArray(transactionsData) ? transactionsData : []).reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense' || t.type === 'credit') {
          runningBalance -= t.amount;
        }
        return { ...t, clubBalance: runningBalance };
      }).reverse();
      setRecentTransactions(transactionsWithBalance);
      
      setPaymentAmounts(prev => {
        const updated = { ...prev };
        delete updated[memberId];
        return updated;
      });
    } catch (error) {
      console.error('납부 처리 실패:', error);
      alert('납부 처리에 실패했습니다.');
    }
  };

  const handlePartialPayment = async (memberId) => {
    try {
      const amount = parseFloat(paymentAmounts[memberId]);
      if (!amount || amount <= 0) {
        alert('올바른 금액을 입력해주세요.');
        return;
      }

      const member = members.find(m => m.id === memberId);
      if (!member) return;

      // 회원의 가장 최근 charge 거래에서 bookingId와 카테고리 찾기
      const memberTransactions = await apiService.fetchMemberTransactions(memberId);
      const recentCharge = memberTransactions.find(t => t.type === 'charge' && t.booking);
      const bookingId = recentCharge?.booking?.id || null;
      
      // 청구 설명에서 카테고리 추출 (예: "회식비청구 - ..." -> "회식비")
      let categoryName = '참가비';
      if (recentCharge?.description) {
        const chargeDesc = recentCharge.description;
        if (chargeDesc.includes('청구')) {
          categoryName = chargeDesc.split('청구')[0];
        }
      }

      const transactionData = {
        type: 'payment',
        amount: amount,
        description: '회비납부',
        date: new Date().toISOString().split('T')[0],
        memberId: memberId,
        bookingId: bookingId,
        createdBy: user.id
      };

      await apiService.createTransaction(transactionData);
      alert(`${member.nickname || member.name}님의 회비 ${amount.toLocaleString()}불이 납부 처리되었습니다.`);
      
      // 거래 내역 포함 전체 데이터 새로고침
      await Promise.all([
        refreshBalanceAndOutstanding(),
        refreshMembers ? refreshMembers() : Promise.resolve()
      ]);
      
      // 최근 거래 내역 다시 불러오기
      const transactionsResponse = await apiService.fetchTransactions({ limit: 50 });
      const transactionsData = transactionsResponse?.transactions || transactionsResponse || [];
      let runningBalance = 0;
      const transactionsWithBalance = (Array.isArray(transactionsData) ? transactionsData : []).reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense' || t.type === 'credit') {
          runningBalance -= t.amount;
        }
        return { ...t, clubBalance: runningBalance };
      }).reverse();
      setRecentTransactions(transactionsWithBalance);
      
      setPaymentAmounts(prev => {
        const updated = { ...prev };
        delete updated[memberId];
        return updated;
      });
    } catch (error) {
      console.error('납부 처리 실패:', error);
      alert('납부 처리에 실패했습니다.');
    }
  };

  const loadLedgerData = async (page = 1, includeCharges = ledgerFilter.showCharges, memberId = ledgerFilter.memberId, bookingId = summaryBookingFilter, skipBookingsFetch = false) => {
    try {
      setIsLoadingTransactions(true);
      
      let transactions;
      let totalPages = 1;
      
      // 특정 라운딩 선택 시 해당 라운딩의 모든 거래를 가져옴 (최대 200건)
      // 전체 조회 시에는 페이지당 20건
      const limit = (bookingId && bookingId !== 'all') ? 200 : 20;
      
      // 라운딩 목록은 처음 한 번만 가져오고, 이후에는 스킵
      const fetchPromises = [
        apiService.fetchClubBalance(),
        apiService.fetchTransactions({ page, limit, includeCharges, memberId, bookingId })
      ];
      
      if (!skipBookingsFetch && ledgerBookings.length === 0) {
        fetchPromises.push(apiService.fetchBookingsWithTransactions());
      }
      
      const results = await Promise.all(fetchPromises);
      const balanceData = results[0];
      const response = results[1];
      const bookingsData = results[2];
      
      transactions = response.transactions || [];
      totalPages = response.pagination?.totalPages || 1;

      setAllTransactions(Array.isArray(transactions) ? transactions : []);
      setLedgerCurrentPage(page);
      setLedgerTotalPages(totalPages);
      setClubBalance(balanceData.balance || 0);
      if (bookingsData) {
        setLedgerBookings(bookingsData);
      }
      
      // 서버에서 계산된 전역 통계 사용
      setLedgerStats({
          income: balanceData.incomeBreakdown || {},
          expense: balanceData.expenseBreakdown || {}
      });

    } catch (error) {
      console.error('장부 데이터 로드 실패:', error);
      setAllTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handlePermissionChange = (featureId, role) => {
    setPermissions({
      ...permissions,
      [featureId]: role
    });
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    try {
      for (const [feature, minRole] of Object.entries(permissions)) {
        await apiService.updateSetting(feature, { minRole });
      }
      setHasChanges(false);
      alert('권한 설정이 저장되었습니다!');
    } catch (error) {
      console.error('권한 설정 저장 실패:', error);
      alert('권한 설정 저장에 실패했습니다.');
    }
  };

  const handleCreateTransaction = async () => {
    try {
      if (!transactionForm.amount || transactionForm.amount <= 0) {
        alert('금액을 입력해주세요.');
        return;
      }

      if ((transactionForm.type === 'charge' || transactionForm.type === 'payment') && !transactionForm.memberId) {
        alert('회원을 선택해주세요.');
        return;
      }

      const transactionData = {
        type: transactionForm.type,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description || '',
        date: transactionForm.date,
        memberId: (transactionForm.type === 'charge' || transactionForm.type === 'payment') ? transactionForm.memberId : null,
        createdBy: user.id
      };

      await apiService.createTransaction(transactionData);
      
      setTransactionForm({
        type: 'charge',
        amount: '',
        description: '',
        memberId: '',
        date: new Date().toISOString().split('T')[0]
      });

      await loadFeeData();
      alert('거래가 등록되었습니다!');
    } catch (error) {
      console.error('거래 생성 실패:', error);
      alert('거래 생성에 실패했습니다.');
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!confirm('이 거래를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await apiService.deleteTransaction(id);
      await loadFeeData();
      alert('거래가 삭제되었습니다!');
    } catch (error) {
      console.error('거래 삭제 실패:', error);
      alert('거래 삭제에 실패했습니다.');
    }
  };

  const handleDeleteAllTransactions = async () => {
    const filteredTransactions = allTransactions
      .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
      .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId);
    
    if (filteredTransactions.length === 0) {
      alert('삭제할 거래가 없습니다.');
      return;
    }

    const confirmMsg = ledgerFilter.type === 'all' && ledgerFilter.memberId === 'all'
      ? `정말 모든 거래 내역 ${filteredTransactions.length}건을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      : `필터링된 거래 내역 ${filteredTransactions.length}건을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      for (const transaction of filteredTransactions) {
        await apiService.deleteTransaction(transaction.id);
      }
      await loadLedgerData();
      await loadFeeData();
      alert(`${filteredTransactions.length}건의 거래가 삭제되었습니다.`);
    } catch (error) {
      console.error('거래 전체 삭제 실패:', error);
      alert('거래 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleApprovalToggle = async () => {
    const newValue = !approvalRequired;
    setApprovalRequired(newValue);
    try {
      await apiService.updateSetting('memberApprovalRequired', { enabled: newValue });
    } catch (error) {
      console.error('회원가입 승인 설정 저장 실패:', error);
      alert('회원가입 승인 설정 저장에 실패했습니다.');
      setApprovalRequired(!newValue);
    }
  };

  const handlePickWinnerToggle = async () => {
    const newValue = !pickWinnerEnabled;
    setPickWinnerEnabled(newValue);
    try {
      await apiService.updateSetting('pickWinnerEnabled', { enabled: newValue });
    } catch (error) {
      console.error('우승자 맞추기 설정 저장 실패:', error);
      alert('우승자 맞추기 설정 저장에 실패했습니다.');
      setPickWinnerEnabled(!newValue);
    }
  };

  const handleSquadRuleToggle = async (type) => {
    const newRules = { ...squadFormationRules, [type]: !squadFormationRules[type] };
    setSquadFormationRules(newRules);
    try {
      await apiService.updateSetting('squadFormationRules', { value: JSON.stringify(newRules) });
    } catch (error) {
      console.error('조편성 규칙 설정 저장 실패:', error);
      setSquadFormationRules(squadFormationRules);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showPermissionMenu === null && showCourseMenu === null) return;
      
      if (showPermissionMenu !== null) {
        const clickedRef = menuRefs.current[showPermissionMenu];
        if (clickedRef && !clickedRef.contains(event.target)) {
          setShowPermissionMenu(null);
        }
      }

      if (showCourseMenu !== null) {
        const clickedRef = courseMenuRefs.current[showCourseMenu];
        if (clickedRef && !clickedRef.contains(event.target)) {
          setShowCourseMenu(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPermissionMenu, showCourseMenu]);

  const handleClubSearch = async () => {
    const query = clubSearchInput.trim();
    if (!query) return;
    // 1) 기존 코스 목록에서 먼저 찾기 (대소문자 무시, 부분 일치)
    const found = courses.find(c => c.name.toLowerCase().includes(query.toLowerCase()));
    if (found) {
      setNewMember(prev => ({ ...prev, club: found.name }));
      setClubSearchInput('');
      setClubAiState('done');
      return;
    }
    // 2) 없으면 AI 검색
    setClubAiState('searching');
    try {
      const result = await apiService.searchCourse(query);
      const malePars = (result.holePars?.male || []).map(p => parseInt(p) || 4);
      const femalePars = (result.holePars?.female || []).map(p => parseInt(p) || 4);
      await apiService.createCourse({
        name: result.name || query,
        address: result.address || '',
        holePars: { male: malePars, female: femalePars },
        nearHoles: Array(18).fill(false),
        isCompetition: false,
      });
      if (refreshCourses) await refreshCourses();
      setNewMember(prev => ({ ...prev, club: result.name || query }));
      setClubSearchInput('');
      setClubAiState('done');
    } catch {
      setClubAiState('error');
    }
  };

  const handleAddMember = async () => {
    if (isAddingMember) return;
    if (!newMember.name || !newMember.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (newMember.phone.length !== 10 || !/^\d+$/.test(newMember.phone)) {
      alert('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    const member = {
      ...newMember,
      balance: 0
    };

    setIsAddingMember(true);
    try {
      const createdMember = await apiService.createMember(member);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setNewMember({ 
        name: '', 
        nickname: '', 
        phone: '', 
        club: '', 
        handicap: '', 
        golflinkNumber: '', 
        clubMemberNumber: '', 
        photo: '', 
        gender: '', 
        birthYear: '', 
        region: '', 
        isClubMember: '', 
        isAdmin: false 
      });
      setShowNewMemberForm(false);
      alert('회원이 추가되었습니다!');
    } catch (error) {
      if (error.code === 'DUPLICATE_PHONE') {
        alert(error.message);
      } else {
        alert('회원 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleChangeRole = async (memberId, newRole) => {
    try {
      await apiService.updateMemberRole(memberId, newRole);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setShowPermissionMenu(null);
      
      const roleNames = {
        '관리자': '관리자',
        '방장': '방장',
        '운영진': '운영진',
        '클럽운영진': '클럽운영진',
        '회원': '회원'
      };
      
      alert(`권한이 "${roleNames[newRole]}"(으)로 변경되었습니다.`);
    } catch (error) {
      console.error('❌ 권한 변경 실패:', error);
      alert('권한 변경 중 오류가 발생했습니다.');
    }
  };

  const handleToggleActive = async (memberId) => {
    try {
      const updatedMember = await apiService.toggleMemberActive(memberId);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setShowPermissionMenu(null);
      alert(updatedMember.isActive === false ? '회원이 비활성화되었습니다.' : '회원이 활성화되었습니다.');
    } catch (error) {
      console.error('❌ 상태 변경 실패:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!confirm('정말로 이 회원을 삭제하시겠습니까?')) {
      return;
    }
    
    setShowPermissionMenu(null);
    
    try {
      await apiService.deleteMember(memberId);
      console.log('✅ 데이터베이스에서 회원 삭제 완료');
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      alert('회원이 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 회원 삭제 실패:', error);
      alert('회원 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditMember = (member) => {
    setEditingMember(member.id);
    setEditMemberData({
      name: member.name || '',
      nickname: member.nickname || '',
      phone: member.phone || '',
      club: member.club || '',
      handicap: member.handicap || '',
      golflinkNumber: member.golflinkNumber || '',
      clubMemberNumber: member.clubMemberNumber || '',
      photo: member.photo || '',
      gender: member.gender || '',
      birthYear: member.birthYear || '',
      region: member.region || '',
      balance: member.balance || 0
    });
    setShowPermissionMenu(null);
  };

  const handleSaveEdit = async () => {
    if (isSavingMember) return;
    if (!editMemberData.name || !editMemberData.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (editMemberData.phone.length !== 10 || !/^\d+$/.test(editMemberData.phone)) {
      alert('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    setIsSavingMember(true);
    try {
      await apiService.updateMember(editingMember, editMemberData);
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setEditingMember(null);
      setEditMemberData(null);
      alert('회원 정보가 수정되었습니다.');
    } catch (error) {
      alert('회원 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditMemberData(null);
  };

  const handleAddCourse = async () => {
    if (isAddingCourse) return;
    if (!newCourse.name) {
      alert('골프장 이름을 입력해주세요.');
      return;
    }

    setIsAddingCourse(true);
    try {
      const courseData = {
        name: newCourse.name,
        address: newCourse.address,
        holePars: {
          male: newCourse.maleHolePars.map(p => parseInt(p) || null),
          female: newCourse.femaleHolePars.map(p => parseInt(p) || null)
        },
        nearHoles: newCourse.nearHoles,
        isCompetition: newCourse.isCompetition
      };
      
      await apiService.createCourse(courseData);
      alert('골프장이 등록되었습니다.');
      
      setNewCourse({ 
        name: '', 
        address: '',
        maleHolePars: Array(18).fill(''),
        femaleHolePars: Array(18).fill(''),
        nearHoles: Array(18).fill(false),
        isCompetition: false
      });
      
      if (refreshCourses) {
        await refreshCourses();
      }
    } catch (error) {
      alert('골프장 등록 중 오류가 발생했습니다.');
    } finally {
      setIsAddingCourse(false);
    }
  };

  const handleHoleParChange = (holeIndex, value, gender) => {
    const parsedValue = value === '' ? '' : parseInt(value) || '';
    if (gender === 'male') {
      const newMalePars = [...newCourse.maleHolePars];
      newMalePars[holeIndex] = parsedValue;
      const newFemalePars = [...newCourse.femaleHolePars];
      newFemalePars[holeIndex] = parsedValue;
      setNewCourse({ ...newCourse, maleHolePars: newMalePars, femaleHolePars: newFemalePars });
    } else {
      const newHolePars = [...newCourse.femaleHolePars];
      newHolePars[holeIndex] = parsedValue;
      setNewCourse({ ...newCourse, femaleHolePars: newHolePars });
    }
  };

  const handleNearHoleChange = (holeIndex) => {
    const newNearHoles = [...newCourse.nearHoles];
    newNearHoles[holeIndex] = !newNearHoles[holeIndex];
    setNewCourse({ ...newCourse, nearHoles: newNearHoles });
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course.id);
    const holePars = course.holePars || { male: Array(18).fill(4), female: Array(18).fill(4) };
    const nearHoles = course.nearHoles || Array(18).fill(false);
    setEditCourseData({
      name: course.name || '',
      address: course.address || '',
      maleHolePars: Array.isArray(holePars) ? holePars : holePars.male || Array(18).fill(4),
      femaleHolePars: Array.isArray(holePars) ? holePars : holePars.female || Array(18).fill(4),
      nearHoles: Array.isArray(nearHoles) ? nearHoles : Array(18).fill(false),
      isCompetition: course.isCompetition || false
    });
    setShowCourseMenu(null);
  };

  const handleSaveCourseEdit = async () => {
    if (!editCourseData.name) {
      alert('골프장 이름을 입력해주세요.');
      return;
    }

    try {
      const updateData = {
        name: editCourseData.name,
        address: editCourseData.address,
        holePars: {
          male: editCourseData.maleHolePars.map(p => parseInt(p) || 4),
          female: editCourseData.femaleHolePars.map(p => parseInt(p) || 4)
        },
        nearHoles: editCourseData.nearHoles,
        isCompetition: editCourseData.isCompetition
      };
      
      await apiService.updateCourse(editingCourse, updateData);
      alert('골프장 정보가 수정되었습니다.');
      
      setEditingCourse(null);
      setEditCourseData(null);
      
      if (refreshCourses) {
        await refreshCourses();
      }
    } catch (error) {
      console.error('❌ 골프장 정보 수정 실패:', error);
      alert('골프장 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelCourseEdit = () => {
    setEditingCourse(null);
    setEditCourseData(null);
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('정말로 이 골프장을 삭제하시겠습니까?')) {
      return;
    }
    
    setShowCourseMenu(null);
    
    try {
      await apiService.deleteCourse(courseId);
      
      if (refreshCourses) {
        await refreshCourses();
      }
      
      alert('골프장이 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 골프장 삭제 실패:', error);
      alert('골프장 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleEditCourseHoleParChange = (holeIndex, value, gender) => {
    const parsedValue = value === '' ? '' : parseInt(value) || '';
    if (gender === 'male') {
      const newMalePars = [...editCourseData.maleHolePars];
      newMalePars[holeIndex] = parsedValue;
      const newFemalePars = [...editCourseData.femaleHolePars];
      newFemalePars[holeIndex] = parsedValue;
      setEditCourseData({ ...editCourseData, maleHolePars: newMalePars, femaleHolePars: newFemalePars });
    } else {
      const newHolePars = [...editCourseData.femaleHolePars];
      newHolePars[holeIndex] = parsedValue;
      setEditCourseData({ ...editCourseData, femaleHolePars: newHolePars });
    }
  };

  const handleEditNearHoleChange = (holeIndex) => {
    const newNearHoles = [...editCourseData.nearHoles];
    newNearHoles[holeIndex] = !newNearHoles[holeIndex];
    setEditCourseData({ ...editCourseData, nearHoles: newNearHoles });
  };

  const handleOpenScoreModal = async (member) => {
    setShowScoreModal(member.id);
    setScoreFormData({
      roundingName: '',
      date: '',
      courseName: '',
      totalScore: ''
    });
    
    try {
      const scores = await apiService.fetchScores(member.id);
      setMemberScores(scores);
    } catch (error) {
      console.error('스코어 조회 실패:', error);
      setMemberScores([]);
    }
  };

  const handleCloseScoreModal = () => {
    setShowScoreModal(null);
    setScoreFormData({
      roundingName: '',
      date: '',
      courseName: '',
      totalScore: ''
    });
    setMemberScores([]);
  };

  const handleSaveScore = async () => {
    const member = members.find(m => m.id === showScoreModal);
    
    if (!scoreFormData.date || !scoreFormData.courseName || !scoreFormData.totalScore) {
      alert('날짜, 골프장, 총 타수를 모두 입력해주세요.');
      return;
    }

    const totalScore = parseInt(scoreFormData.totalScore);
    if (isNaN(totalScore) || totalScore <= 0) {
      alert('총 타수는 유효한 숫자여야 합니다.');
      return;
    }

    try {
      const scoreData = {
        memberId: member.id,
        markerId: user.id,
        date: scoreFormData.date,
        courseName: scoreFormData.courseName,
        totalScore: totalScore,
        coursePar: 72,
        holes: JSON.stringify([])
      };

      await apiService.createScore(scoreData);
      alert(`${member.nickname || member.name}의 스코어가 저장되었습니다!`);
      
      setScoreFormData({
        roundingName: '',
        date: '',
        courseName: '',
        totalScore: ''
      });
      
      const updatedScores = await apiService.fetchScores(member.id);
      setMemberScores(updatedScores);
    } catch (error) {
      console.error('스코어 저장 실패:', error);
      alert('스코어 저장 중 오류가 발생했습니다.');
    }
  };

  const hasAdminAccess = user.role === '관리자' || user.role === '방장' || user.role === '운영진' || user.role === '클럽운영진' || user.isAdmin;
  
  const roleHierarchy = ['관리자', '방장', '운영진', '클럽운영진', '회원'];
  
  const hasFeaturePermission = (featureId) => {
    if (user.isAdmin) return true;
    const requiredRole = permissions[featureId] || '관리자';
    const userRoleIndex = roleHierarchy.indexOf(user.role);
    const requiredRoleIndex = roleHierarchy.indexOf(requiredRole);
    if (userRoleIndex === -1) return false;
    return userRoleIndex <= requiredRoleIndex;
  };
  
  if (!hasAdminAccess) {
    return (
      <div>
        <PageHeader title="관리자" user={user} showBackButton={false} />
        <div className="page-content">
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>◆</div>
            <p>관리자 또는 운영진 권한이 필요합니다</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="관리자"
        user={user}
        showBackButton={false}
        rightContent={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#EBF2FF', borderRadius: 999, padding: '4px 10px 4px 7px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#0047AB"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0047AB' }}>Admin Mode</span>
          </div>
        }
      />

      <div className="page-content" style={ (activeTab === 'menu' || activeTab === 'members' || activeTab === 'scoreManagement') ? { padding: 0 } : {} }>
        {activeTab === 'menu' && (() => {
          const adminMenuItems = [
            {
              tab: 'members',
              label: '회원 관리',
              desc: '회원 가입 승인, 등급 조정 및 이용 내역을 관리합니다.',
              action: '상세 관리하기',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
              always: true,
            },
            {
              tab: 'clubAccounting',
              path: '/settlement',
              label: '클럽 회계',
              desc: '수입·지출 입력, 미수금 납부 처리, 월 마감 및 이월을 관리합니다.',
              action: '회계 관리하기',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M4 10v7h3v-7H4zm6.5 0v7h3v-7h-3zM2 22h19v-3H2v3zm15-12v7h3v-7h-3zM11.5 1L2 6v2h19V6l-9.5-5z"/></svg>,
              always: true,
            },
            {
              tab: 'ledger',
              label: '거래 내역',
              desc: '전체 거래 내역을 조회하고 수정·삭제합니다.',
              action: '내역 조회하기',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/></svg>,
              show: showLedger,
            },
            {
              tab: 'courses',
              label: '골프장 관리',
              desc: '코스 유지보수, 예약 현황 및 홀 컨디션을 조정합니다.',
              action: '코스 관리하기',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/></svg>,
              always: true,
            },
            {
              tab: 'scoreManagement',
              label: '스코어 관리',
              desc: '라운딩별 스코어를 조회하고 수정합니다.',
              action: '스코어 조회하기',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>,
              always: true,
            },
            {
              tab: 'settings',
              label: '앱 설정',
              desc: '앱 기본 설정 및 공지사항을 관리합니다.',
              action: '설정 열기',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>,
              roles: ['관리자', '방장', '운영진'],
            },
            {
              tab: 'developer',
              label: '개발자 설정',
              desc: '권한 설정 및 앱 소개문구를 관리합니다.',
              action: '개발자 설정',
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="#0047AB"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>,
              roles: ['관리자'],
            },
          ].filter(item => {
            if (item.always) return true;
            if (item.show !== undefined) return item.show;
            if (item.roles) return item.roles.includes(user.role);
            return false;
          });

          return (
            <div style={{ background: '#EEF1F6', minHeight: '100vh', paddingBottom: 100 }}>
              {/* 히어로 배너 */}
              <div style={{ margin: '16px 16px 20px', background: 'linear-gradient(135deg, #0047AB 0%, #1E56C5 100%)', borderRadius: 20, padding: '22px 22px 24px', boxShadow: '0 8px 24px rgba(0,71,171,0.25)' }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(177,197,255,0.8)', letterSpacing: '0.18em', marginBottom: 12 }}>AZURE STANDARD DASHBOARD</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.35, marginBottom: 10, letterSpacing: '-0.02em' }}>
                  반갑습니다, {user.nickname || user.name}님.<br />오늘의 클럽 운영을 시작하세요.
                </div>
                <div style={{ fontSize: 13, color: 'rgba(177,197,255,0.85)', fontWeight: 400 }}>핵심 기능을 한눈에 제어할 수 있습니다.</div>
              </div>

              {/* 메뉴 카드 목록 */}
              <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {adminMenuItems.map(item => (
                  <div key={item.tab} onClick={() => item.path ? navigate(item.path) : setActiveTab(item.tab)}
                    style={{ background: '#fff', borderRadius: 16, padding: '20px 20px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#1E293B', marginBottom: 5 }}>{item.label}</div>
                        <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.55 }}>{item.desc}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: 13 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#0047AB' }}>{item.action}</span>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0047AB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {activeTab === 'members' && (
          <div style={{ background: '#EEF1F6', minHeight: '100vh' }}>
            <div style={{ padding: '16px 16px 0' }}>
            {/* 가입 링크 복사 */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>회원가입 링크</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>링크를 공유해 누구나 가입 신청 가능</div>
              </div>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/join`;
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(url).then(() => alert('링크가 복사되었습니다!\n\n' + url));
                  } else {
                    prompt('아래 링크를 복사하세요:', url);
                  }
                }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#0047AB', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
                링크 복사
              </button>
            </div>

            {/* 검색 */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              </div>
              <input
                type="text"
                placeholder="멤버 이름 또는 닉네임 검색"
                value={memberSearchTerm}
                onChange={(e) => setMemberSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '13px 16px 13px 44px', fontSize: '14px', border: 'none', borderRadius: 999, background: '#fff', boxSizing: 'border-box', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', outline: 'none' }}
              />
              {memberSearchTerm && (
                <button onClick={() => setMemberSearchTerm('')}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#94A3B8', padding: 4 }}>✕</button>
              )}
            </div>

            {/* 토글 */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>활동 중인 멤버만 보기</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>현재 라운딩 가능한 멤버 리스트</div>
              </div>
              <div onClick={() => setShowInactive(!showInactive)}
                style={{ width: 44, height: 26, borderRadius: 13, background: !showInactive ? '#0047AB' : '#CBD5E1', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: 3, left: !showInactive ? 21 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
              </div>
            </div>

            {/* 통계 */}
            {(() => {
              const totalActive = members.filter(m => m.isActive !== false && m.approvalStatus !== 'pending').length;
              const filtered = members.filter(m =>
                (showInactive || m.isActive !== false) &&
                m.approvalStatus !== 'pending' &&
                (memberSearchTerm === '' || m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
              ).length;
              return (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: 'linear-gradient(135deg, #0047AB 0%, #1E56C5 100%)', borderRadius: 16, padding: '16px 18px', boxShadow: '0 4px 16px rgba(0,71,171,0.25)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.1 }}>
                      <svg width="70" height="70" viewBox="0 0 24 24" fill="white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: 'rgba(177,197,255,0.8)', letterSpacing: '0.12em', marginBottom: 8 }}>TOTAL MEMBERS</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{totalActive.toLocaleString()}</div>
                  </div>
                  <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.12em', marginBottom: 8 }}>ACTIVE TODAY</div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0047AB', lineHeight: 1 }}>{filtered}</div>
                  </div>
                </div>
              );
            })()}
            </div>

            {members.filter(m => m.approvalStatus === 'pending' &&
              (memberSearchTerm === '' ||
               m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
               m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).length > 0 && (
              <div style={{ margin: '0 16px 16px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 16, padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#D97706', letterSpacing: '0.1em', marginBottom: 12 }}>
                  PENDING APPROVAL · {members.filter(m => m.approvalStatus === 'pending' &&
                    (memberSearchTerm === '' ||
                     m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                     m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).length}명
                </div>
                {members.filter(m => m.approvalStatus === 'pending' && 
                  (memberSearchTerm === '' || 
                   m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                   m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).map(member => (
                  <div
                    key={member.id}
                    style={{
                      padding: '12px',
                      background: 'white',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                  >
                    <div style={{ flexShrink: 0, position: 'relative' }}>
                      {member.photo ? (
                        <img 
                          src={member.photo} 
                          alt={member.name}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '2px solid var(--border-color)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '60px',
                          height: '60px',
                          background: '#ddd',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '28px',
                          color: 'var(--text-dark)', opacity: 0.7
                        }}>
                          •
                        </div>
                      )}
                      
                      {member.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(member.role) && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-3px',
                          right: '-3px',
                          zIndex: 10
                        }}>
                          <CrownIcon role={member.role} size={20} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>
                        {member.name} {member.nickname && `(${member.nickname})`}
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        전화번호: {member.phone}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={async () => {
                          if (confirm(`${member.name} 회원을 승인하시겠습니까?`)) {
                            try {
                              await apiService.approveMember(member.id);
                              await refreshMembers();
                              alert('승인되었습니다!');
                            } catch (error) {
                              console.error('승인 실패:', error);
                              alert('승인에 실패했습니다.');
                            }
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--primary-green)',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        승인
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`${member.name} 회원을 거부하시겠습니까?`)) {
                            try {
                              await apiService.rejectMember(member.id);
                              await refreshMembers();
                              alert('거부되었습니다.');
                            } catch (error) {
                              console.error('거부 실패:', error);
                              alert('거부에 실패했습니다.');
                            }
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          background: '#BF4E30',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        거부
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ padding: '0 16px 100px' }}>
              {/* MEMBER DIRECTORY 라벨 */}
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.12em', marginBottom: 12, paddingLeft: 2 }}>MEMBER DIRECTORY</div>

              {/* 회원 카드 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {members.filter(member =>
                member.approvalStatus !== 'pending' &&
                (showInactive || member.isActive !== false) &&
                (memberSearchTerm === '' ||
                 member.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                 member.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))
              ).map(member => {
                const isGA = !!(member.golflinkNumber && member.golflinkNumber.toString().trim());
                const hcpVal = isGA
                  ? (member.gaHandy || member.handicap)
                  : (member.houseHandy || member.handicap);
                const hcpDisplay = hcpVal ? `${isGA ? 'GA' : 'HH'}(${hcpVal})` : '-';

                const roleBadge = (() => {
                  if (['관리자', '방장'].includes(member.role)) return { label: 'VIP', bg: '#FEF2F2', color: '#DC2626' };
                  if (['운영진'].includes(member.role)) return { label: 'STAFF', bg: '#EFF6FF', color: '#2563EB' };
                  if (['클럽운영진'].includes(member.role)) return { label: 'CLUB', bg: '#F0FDF4', color: '#16A34A' };
                  return null;
                })();

                const isOnline = member.lastActiveAt && (Date.now() - new Date(member.lastActiveAt).getTime()) < 5 * 60 * 1000;
                const onlineIndicatorColor = isOnline ? '#22C55E' : '#CBD5E1';

                return (
                  <div key={member.id} onClick={() => navigate(`/member/${member.id}`)}
                    style={{ background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', opacity: member.isActive === false ? 0.65 : 1 }}>
                    {/* 사진 */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', border: '2px solid #F1F5F9' }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#E8ECF0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: '#94A3B8' }}>👤</div>
                      )}
                      {/* 온라인 인디케이터 */}
                      <div style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: onlineIndicatorColor, border: '2px solid #fff' }} />
                      {/* 왕관 아이콘 */}
                      {member.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(member.role) && (
                        <div style={{ position: 'absolute', top: -3, right: -3, zIndex: 10 }}>
                          <CrownIcon role={member.role} size={20} />
                        </div>
                      )}
                    </div>

                    {/* 정보 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: '#1E293B' }}>{member.nickname || member.name}</span>
                        {roleBadge && (
                          <span style={{ fontSize: 9, fontWeight: 800, color: roleBadge.color, background: roleBadge.bg, borderRadius: 4, padding: '2px 5px', letterSpacing: '0.05em' }}>{roleBadge.label}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>
                        {member.name !== (member.nickname || member.name) ? member.name : ''}
                        {member.name !== (member.nickname || member.name) && member.club ? ' • ' : ''}
                        {member.club || ''}
                      </div>
                    </div>

                    {/* 핸디캡 */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 3 }}>HANDICAP</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#0047AB' }}>{hcpDisplay}</div>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {editingMember && editMemberData && (
              <div className="card" style={{ marginTop: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ✎ 회원 정보 수정
                </h3>
                <input
                  type="text"
                  placeholder="이름"
                  value={editMemberData.name}
                  onChange={(e) => setEditMemberData({ ...editMemberData, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="대화명 (닉네임)"
                  value={editMemberData.nickname}
                  onChange={(e) => setEditMemberData({ ...editMemberData, nickname: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="전화번호 (예: 0100 123 456)"
                  value={editMemberData.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setEditMemberData({ ...editMemberData, phone: digits });
                  }}
                  maxLength={12}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    성별
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="edit-gender"
                        value="남"
                        checked={editMemberData.gender === '남'}
                        onChange={(e) => setEditMemberData({ ...editMemberData, gender: e.target.value })}
                      />
                      <span>남</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="edit-gender"
                        value="여"
                        checked={editMemberData.gender === '여'}
                        onChange={(e) => setEditMemberData({ ...editMemberData, gender: e.target.value })}
                      />
                      <span>여</span>
                    </label>
                  </div>
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="출생연도 (예: 1990)"
                  value={editMemberData.birthYear}
                  onChange={(e) => setEditMemberData({ ...editMemberData, birthYear: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="사는 지역 (예: Lidcombe, Ryde)"
                  value={editMemberData.region}
                  onChange={(e) => setEditMemberData({ ...editMemberData, region: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ marginBottom: '12px' }}>
                  <SearchableDropdown
                    options={courses}
                    value={editMemberData.club || ''}
                    onChange={(value) => setEditMemberData({ ...editMemberData, club: value })}
                    placeholder="소속 클럽 선택 (검색 가능)"
                    displayKey="name"
                    valueKey="name"
                  />
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="핸디"
                  value={editMemberData.handicap}
                  onChange={(e) => setEditMemberData({ ...editMemberData, handicap: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Golflink Number"
                  value={editMemberData.golflinkNumber}
                  onChange={(e) => setEditMemberData({ ...editMemberData, golflinkNumber: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="클럽 회원번호"
                  value={editMemberData.clubMemberNumber}
                  onChange={(e) => setEditMemberData({ ...editMemberData, clubMemberNumber: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="number"
                  placeholder="미수금"
                  value={editMemberData.balance}
                  onChange={(e) => setEditMemberData({ ...editMemberData, balance: Number(e.target.value) })}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: '#BD5B43',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    취소하기
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            {/* FAB - 새 회원 추가 */}
            <button onClick={() => setShowNewMemberForm(true)}
              style={{ position: 'fixed', bottom: 90, right: 20, width: 52, height: 52, borderRadius: '50%', background: '#0047AB', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,71,171,0.4)', zIndex: 100 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </button>

            {/* 새 회원 추가 바텀시트 */}
            {showNewMemberForm && (
              <>
                {/* 딤 오버레이 — nav 바(z:1000) 아래 */}
                <div
                  onClick={() => setShowNewMemberForm(false)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, backdropFilter: 'blur(2px)' }}
                />
                {/* 시트 본체 — 내비 바 높이만큼 bottom 띄움 */}
                <div style={{
                  position: 'fixed',
                  bottom: 'calc(60px + env(safe-area-inset-bottom))',
                  left: 'max(0px, calc((100vw - 768px) / 2))',
                  right: 'max(0px, calc((100vw - 768px) / 2))',
                  background: '#fff', borderRadius: '22px 22px 0 0',
                  zIndex: 501, display: 'flex', flexDirection: 'column',
                  maxHeight: 'calc(90dvh - 60px)',
                  overflow: 'hidden',
                  touchAction: 'pan-y',
                }}>
                  {/* 핸들 + 헤더 (고정) */}
                  <div style={{ flexShrink: 0, padding: '12px 20px 0' }}>
                    <div style={{ width: 40, height: 4, background: '#D1D5DB', borderRadius: 2, margin: '0 auto 14px' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>새 회원 추가</span>
                      <button onClick={() => setShowNewMemberForm(false)}
                        style={{ background: '#f1f5f9', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b', fontSize: 18 }}>×</button>
                    </div>
                    <div style={{ height: 1, background: '#f1f5f9' }} />
                  </div>

                  {/* 스크롤 가능 폼 영역 */}
                  <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1, padding: '16px 20px 8px', touchAction: 'pan-y', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
                    {/* 모바일 최적화 입력 스타일 */}
                    {(() => {
                      const fieldStyle = {
                        width: '100%', maxWidth: '100%', boxSizing: 'border-box',
                        padding: '13px 14px', borderRadius: 12,
                        border: '1.5px solid #e2e8f0', fontSize: 15,
                        color: '#1e293b', background: '#f8fafc',
                        outline: 'none', display: 'block', marginBottom: 12,
                        minWidth: 0,
                      };
                      const labelStyle = {
                        display: 'block', fontSize: 12, fontWeight: 700,
                        color: '#64748b', marginBottom: 6, letterSpacing: '0.03em',
                      };
                      const sectionStyle = { marginBottom: 16 };
                      return (
                        <>
                          {/* 이름 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>이름 *</label>
                            <input type="text" placeholder="홍길동" value={newMember.name}
                              onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                              style={fieldStyle} />
                          </div>

                          {/* 닉네임 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>대화명 (닉네임)</label>
                            <input type="text" placeholder="앱에서 표시될 이름" value={newMember.nickname}
                              onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
                              style={fieldStyle} />
                          </div>

                          {/* 전화번호 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>전화번호</label>
                            <input type="tel" placeholder="0100 123 456" inputMode="numeric"
                              value={newMember.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setNewMember({ ...newMember, phone: digits });
                              }}
                              maxLength={12} style={fieldStyle} />
                          </div>

                          {/* 성별 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>성별</label>
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                              {['남', '여'].map(g => (
                                <button key={g}
                                  onClick={() => setNewMember({ ...newMember, gender: g })}
                                  style={{
                                    flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid',
                                    borderColor: newMember.gender === g ? '#0047AB' : '#e2e8f0',
                                    background: newMember.gender === g ? '#EFF6FF' : '#f8fafc',
                                    color: newMember.gender === g ? '#0047AB' : '#64748b',
                                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                  }}>
                                  {g === '남' ? '👨 남' : '👩 여'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* 출생연도 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>출생연도</label>
                            <input type="number" placeholder="예: 1990" inputMode="numeric"
                              value={newMember.birthYear}
                              onChange={(e) => setNewMember({ ...newMember, birthYear: e.target.value })}
                              style={fieldStyle} />
                          </div>

                          {/* 지역 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>사는 지역</label>
                            <input type="text" placeholder="예: Lidcombe, Ryde"
                              value={newMember.region}
                              onChange={(e) => setNewMember({ ...newMember, region: e.target.value })}
                              style={fieldStyle} />
                          </div>

                          {/* 사진 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>사진 (본인)</label>
                            <label style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '12px 14px', borderRadius: 12, border: '1.5px dashed #cbd5e1',
                              background: '#f8fafc', cursor: 'pointer',
                              width: '100%', boxSizing: 'border-box',
                            }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                              </svg>
                              <span style={{ fontSize: 14, color: '#64748b' }}>
                                {newMember.photo ? '사진 변경하기' : '사진 선택하기'}
                              </span>
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setNewMember({ ...newMember, photo: reader.result });
                                    reader.readAsDataURL(file);
                                  }
                                }} />
                            </label>
                            {newMember.photo && (
                              <img src={newMember.photo} alt="미리보기"
                                style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '2px solid #e2e8f0', marginTop: 8 }} />
                            )}
                          </div>

                          {/* 클럽 멤버 */}
                          <div style={sectionStyle}>
                            <label style={labelStyle}>클럽 멤버이신가요?</label>
                            <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                              {[['yes', '예'], ['no', '아니오']].map(([val, text]) => (
                                <button key={val}
                                  onClick={() => setNewMember({ ...newMember, isClubMember: val })}
                                  style={{
                                    flex: 1, padding: '12px', borderRadius: 12, border: '1.5px solid',
                                    borderColor: newMember.isClubMember === val ? '#0047AB' : '#e2e8f0',
                                    background: newMember.isClubMember === val ? '#EFF6FF' : '#f8fafc',
                                    color: newMember.isClubMember === val ? '#0047AB' : '#64748b',
                                    fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                  }}>{text}</button>
                              ))}
                            </div>
                          </div>

                          {/* 클럽 멤버일 때 추가 필드 */}
                          {newMember.isClubMember === 'yes' && (
                            <>
                              <div style={sectionStyle}>
                                <label style={labelStyle}>소속 클럽</label>
                                {/* 선택된 클럽 표시 */}
                                {newMember.club && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #BBF7D0', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span style={{ fontSize: 14, color: '#059669', fontWeight: 600 }}>✓</span>
                                      <span style={{ fontSize: 14, color: '#059669', fontWeight: 700 }}>{newMember.club}</span>
                                    </div>
                                    <button onClick={() => { setNewMember(prev => ({ ...prev, club: '' })); setClubAiState('idle'); }}
                                      style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 16, cursor: 'pointer', padding: '0 4px' }}>×</button>
                                  </div>
                                )}
                                {/* 검색 입력 */}
                                <div style={{ display: 'flex', gap: 8, width: '100%', boxSizing: 'border-box' }}>
                                  <input
                                    type="text"
                                    placeholder="골프장 이름으로 검색..."
                                    value={clubSearchInput}
                                    onChange={(e) => { setClubSearchInput(e.target.value); setClubAiState('idle'); }}
                                    onKeyDown={(e) => e.key === 'Enter' && handleClubSearch()}
                                    style={{ flex: 1, minWidth: 0, padding: '13px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 15, color: '#1e293b', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                  <button
                                    onClick={handleClubSearch}
                                    disabled={clubAiState === 'searching' || !clubSearchInput.trim()}
                                    style={{ padding: '13px 16px', background: (clubAiState === 'searching' || !clubSearchInput.trim()) ? '#93C5FD' : '#0047AB', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: (clubAiState === 'searching' || !clubSearchInput.trim()) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                                  >
                                    {clubAiState === 'searching' ? '검색중...' : '검색'}
                                  </button>
                                </div>
                                {clubAiState === 'error' && (
                                  <div style={{ marginTop: 6, fontSize: 12, color: '#DC2626', fontWeight: 600 }}>검색에 실패했습니다. 골프장 관리 메뉴에서 직접 추가해주세요.</div>
                                )}
                              </div>
                              <div style={sectionStyle}>
                                <label style={labelStyle}>Golflink Number</label>
                                <input type="text" placeholder="Golflink Number" value={newMember.golflinkNumber}
                                  onChange={(e) => setNewMember({ ...newMember, golflinkNumber: e.target.value })}
                                  style={fieldStyle} />
                              </div>
                              <div style={sectionStyle}>
                                <label style={labelStyle}>클럽 회원번호</label>
                                <input type="text" placeholder="클럽 회원번호" value={newMember.clubMemberNumber}
                                  onChange={(e) => setNewMember({ ...newMember, clubMemberNumber: e.target.value })}
                                  style={fieldStyle} />
                              </div>
                              <div style={sectionStyle}>
                                <label style={labelStyle}>핸디</label>
                                <input type="number" placeholder="핸디캡" inputMode="decimal" value={newMember.handicap}
                                  onChange={(e) => setNewMember({ ...newMember, handicap: e.target.value })}
                                  style={fieldStyle} />
                              </div>
                            </>
                          )}

                        </>
                      );
                    })()}
                  </div>

                  {/* 하단 버튼 (고정) */}
                  <div style={{
                    flexShrink: 0, padding: '12px 20px 16px',
                    background: '#fff', borderTop: '1px solid #f1f5f9',
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                      <button onClick={() => setShowNewMemberForm(false)}
                        style={{ padding: '14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                        취소
                      </button>
                      <button onClick={handleAddMember}
                        style={{ padding: '14px', borderRadius: 12, border: 'none', background: '#0047AB', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
                        추가하기
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div>
            <div className="card" style={{ 
              background: 'linear-gradient(135deg, #FFD54F 0%, #FFC107 100%)',
              color: '#1a1a1a',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '10px', marginBottom: '4px', opacity: 0.9 }}>
                  클럽 잔액
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700' }}>
                  ${clubBalance.toLocaleString()}
                </div>
              </div>
              <div style={{ 
                fontSize: '11px',
                textAlign: 'right',
                opacity: 0.9
              }}>
                <div>미수금 회원</div>
                <div style={{ fontSize: '20px', fontWeight: '700', marginTop: '4px' }}>{outstandingBalances.length}명</div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: '8px',
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '16px'
            }}>
              <button
                onClick={() => setClubTab('income')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: clubTab === 'income' ? 'var(--primary-green)' : 'transparent',
                  color: clubTab === 'income' ? 'white' : 'var(--text-dark)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                클럽 입금
              </button>
              <button
                onClick={() => setClubTab('expense')}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: clubTab === 'expense' ? '#E59879' : 'transparent',
                  color: clubTab === 'expense' ? 'white' : 'var(--text-dark)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                클럽 출금
              </button>
            </div>

            {clubTab === 'income' && (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  클럽 입금 생성
                </h3>
                
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>
                      입금항목 *
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {incomeCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedIncome({...selectedIncome, categoryId: cat.id, manualItemName: '', manualAmount: ''})}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: selectedIncome.categoryId === cat.id ? '600' : '500',
                            background: selectedIncome.categoryId === cat.id ? 'var(--primary-green)' : '#f0f0f0',
                            color: selectedIncome.categoryId === cat.id ? 'white' : 'var(--text-dark)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      날짜
                    </label>
                    <input
                      type="date"
                      value={selectedIncome.date}
                      onChange={(e) => setSelectedIncome({...selectedIncome, date: e.target.value})}
                      style={{
                        width: '50%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {(() => {
                    const selectedCategory = incomeCategories.find(c => c.id === selectedIncome.categoryId);
                    const isOther = selectedCategory?.name === '기타';
                    
                    if (isOther) {
                      return (
                        <div style={{ 
                          display: 'flex', 
                          gap: '8px', 
                          alignItems: 'flex-end',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ flex: '1', minWidth: '120px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                              항목명 *
                            </label>
                            <input
                              type="text"
                              placeholder="입금 항목 입력..."
                              value={selectedIncome.manualItemName || ''}
                              onChange={(e) => setSelectedIncome({...selectedIncome, manualItemName: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <div style={{ flex: '1', minWidth: '100px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                              금액 *
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={selectedIncome.manualAmount || ''}
                              onChange={(e) => setSelectedIncome({...selectedIncome, manualAmount: e.target.value})}
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <button
                            onClick={async () => {
                              if (!selectedIncome.manualItemName?.trim() || !selectedIncome.manualAmount) {
                                alert('항목명과 금액을 입력해주세요.');
                                return;
                              }
                              try {
                                const transactionData = {
                                  type: 'donation',
                                  amount: Math.round(parseFloat(selectedIncome.manualAmount) * 10) / 10,
                                  description: `기타 - ${selectedIncome.manualItemName.trim()}`,
                                  date: selectedIncome.date
                                };
                                if (user?.id) {
                                  transactionData.createdBy = user.id;
                                }
                                console.log('기타 입금 데이터:', transactionData);
                                const result = await apiService.createTransaction(transactionData);
                                console.log('기타 입금 결과:', result);
                                alert(`기타 입금이 저장되었습니다: ${selectedIncome.manualItemName.trim()} ($${selectedIncome.manualAmount})`);
                                setSelectedIncome({
                                  ...selectedIncome,
                                  manualItemName: '',
                                  manualAmount: '',
                                  categoryId: ''
                                });
                                loadFeeData();
                              } catch (error) {
                                console.error('기타 입금 저장 실패:', error);
                                console.error('에러 상세:', error.message);
                                alert('저장에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
                              }
                            }}
                            style={{
                              padding: '12px 24px',
                              background: 'var(--primary-green)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            저장
                          </button>
                        </div>
                      );
                    }
                    
                    return null;
                  })()}

                  <button
                    onClick={handleOpenIncomeModal}
                    disabled={(() => {
                      const selectedCategory = incomeCategories.find(c => c.id === selectedIncome.categoryId);
                      return selectedCategory?.name === '기타';
                    })()}
                    style={{
                      width: '100%',
                      padding: '14px',
                      background: (() => {
                        const selectedCategory = incomeCategories.find(c => c.id === selectedIncome.categoryId);
                        return selectedCategory?.name === '기타' ? '#ccc' : 'var(--primary-green)';
                      })(),
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: (() => {
                        const selectedCategory = incomeCategories.find(c => c.id === selectedIncome.categoryId);
                        return selectedCategory?.name === '기타' ? 'not-allowed' : 'pointer';
                      })()
                    }}
                  >
                    회원&금액 선택
                  </button>
                </div>
              </div>
            )}

            {clubTab === 'expense' && (
              <div className="card" style={{ marginBottom: '16px', background: '#F5F4EE' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  클럽 출금 생성
                </h3>
                
                <div style={{ display: 'grid', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '600' }}>
                      출금항목 *
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {expenseCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedExpense({...selectedExpense, categoryId: cat.id})}
                          style={{
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: selectedExpense.categoryId === cat.id ? '600' : '500',
                            background: selectedExpense.categoryId === cat.id ? '#E59879' : '#f0f0f0',
                            color: selectedExpense.categoryId === cat.id ? 'white' : 'var(--text-dark)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textAlign: 'center',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const category = expenseCategories.find(c => c.id === selectedExpense.categoryId);
                    const isRefundOrCredit = category?.name === '환불' || category?.name === '회원 크레딧';
                    
                    return (
                      <>
                        {!isRefundOrCredit && (
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                              라운딩 선택 (선택사항)
                            </label>
                            <select
                              value={selectedExpense.bookingId || ''}
                              onChange={(e) => setSelectedExpense({...selectedExpense, bookingId: e.target.value || null})}
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px',
                                background: 'white'
                              }}
                            >
                              <option value="">선택 안 함</option>
                              {bookings
                                .filter(b => b.type !== '컴페티션')
                                .map(booking => (
                                  <option key={booking.id} value={booking.id}>
                                    {booking.title || '이름 없음'} - {booking.courseName}
                                  </option>
                                ))}
                            </select>
                          </div>
                        )}

                        {isRefundOrCredit ? (
                          <button
                            onClick={handleOpenRefundModal}
                            style={{
                              width: '100%',
                              padding: '14px',
                              background: 'var(--primary-green)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            회원&금액 선택
                          </button>
                        ) : (
                          <div>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                              금액 *
                            </label>
                            <input
                              type="number"
                              value={selectedExpense.amount}
                              onChange={(e) => setSelectedExpense({...selectedExpense, amount: e.target.value})}
                              placeholder="금액을 입력하세요"
                              style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      메모 (선택사항)
                    </label>
                    <textarea
                      value={selectedExpense.memo}
                      onChange={(e) => setSelectedExpense({...selectedExpense, memo: e.target.value})}
                      placeholder="추가 설명을 입력하세요"
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      영수증 이미지 (선택사항)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              alert('이미지 크기는 5MB 이하여야 합니다.');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setSelectedExpense({...selectedExpense, receiptImage: reader.result});
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{
                          flex: 1,
                          padding: '10px',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          background: 'white'
                        }}
                      />
                      {selectedExpense.receiptImage && (
                        <button
                          onClick={() => setSelectedExpense({...selectedExpense, receiptImage: ''})}
                          style={{
                            padding: '10px 12px',
                            background: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    {selectedExpense.receiptImage && (
                      <div style={{ marginTop: '8px' }}>
                        <img 
                          src={selectedExpense.receiptImage} 
                          alt="영수증 미리보기" 
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '150px', 
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)'
                          }} 
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                      날짜
                    </label>
                    <input
                      type="date"
                      value={selectedExpense.date}
                      onChange={(e) => setSelectedExpense({...selectedExpense, date: e.target.value})}
                      style={{
                        width: '50%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  {(() => {
                    const category = expenseCategories.find(c => c.id === selectedExpense.categoryId);
                    const isRefundOrCredit = category?.name === '환불' || category?.name === '회원 크레딧';
                    
                    if (isRefundOrCredit) return null;
                    
                    return (
                      <button
                        onClick={handleClubExpense}
                        style={{
                          width: '100%',
                          padding: '14px',
                          background: 'var(--primary-green)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '16px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        적용
                      </button>
                    );
                  })()}
                </div>
              </div>
            )}

            {outstandingBalances.length > 0 && (
              <div className="card">
                <h2 style={{ marginBottom: '8px', fontSize: '20px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  클럽 입금 처리
                </h2>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--alert-red)' }}>
                  ⚠ 미수금 회원
                </h3>
                <div>
                  {outstandingBalances.map(ob => (
                    <div 
                      key={ob.memberId}
                      style={{
                        padding: '12px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>{ob.memberNickname || ob.memberName}</div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: 'var(--alert-red)'
                        }}>
                          ${Math.abs(ob.balance).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleFullPayment(ob.memberId, ob.balance)}
                          style={{
                            padding: '10px 18px',
                            background: '#D1FAE5',
                            color: '#065F46',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          전체금액지불
                        </button>
                        <div style={{ flex: 1 }}></div>
                        <input
                          type="number"
                          placeholder="금액"
                          value={paymentAmounts[ob.memberId] || ''}
                          onChange={(e) => setPaymentAmounts(prev => ({
                            ...prev,
                            [ob.memberId]: e.target.value
                          }))}
                          style={{
                            width: '100px',
                            padding: '8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                        <button
                          onClick={() => handlePartialPayment(ob.memberId)}
                          style={{
                            padding: '8px 14px',
                            background: '#D1FAE5',
                            color: '#065F46',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          납부처리
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    최근 거래 내역
                  </h3>
                  <span 
                    onClick={() => setActiveTab('ledger')}
                    style={{ 
                      fontSize: '13px', 
                      color: 'var(--primary-green)',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    전체보기
                  </span>
                </div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: 'var(--primary-green)',
                  background: 'var(--bg-green)',
                  padding: '6px 12px',
                  borderRadius: '6px'
                }}>
                  클럽 잔액: ${clubBalance.toLocaleString()}
                </div>
              </div>
              {recentTransactions.length === 0 ? (
                <div style={{ 
                  padding: '40px',
                  textAlign: 'center',
                  opacity: 0.7
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>$</div>
                  <p>거래 내역이 없습니다</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                  }}>
                    <thead>
                      <tr style={{
                        background: 'var(--bg-green)',
                        borderBottom: '2px solid var(--primary-green)'
                      }}>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>날짜</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>회원</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>항목</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>금액</th>
                        <th style={{ padding: '6px 4px 6px 16px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>라운딩</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions
                        .filter(t => {
                          // GLOBAL: Always hide creditDonation in Club Tab
                          if (t.type === 'creditDonation') return false;
                          
                          if (ledgerFilter.showCharges) return true;
                          
                          if (t.type === 'charge') return false;
                          if (t.type === 'expense' && t.category) {
                            const cat = t.category;
                            if (cat.includes('크레딧') && (cat.includes('차감') || cat.includes('납부'))) return false;
                          }
                          return true;
                        })
                        .map(transaction => {
                        // Club Tab: expense, charge, credit are negative (money going out from club)
                        const typeColor =
                          transaction.type === 'payment' ? 'var(--success-green)' :
                          transaction.type === 'donation' ? 'var(--success-green)' :
                          transaction.type === 'creditDonation' ? 'var(--success-green)' :
                          transaction.type === 'charge' ? 'var(--alert-red)' :
                          transaction.type === 'expense' ? 'var(--alert-red)' :
                          transaction.type === 'credit' ? 'var(--alert-red)' :
                          'var(--success-green)';

                        // Club Tab: expense, charge, credit are negative (club pays out)
                        const sign = 
                          (transaction.type === 'payment' || transaction.type === 'donation' || transaction.type === 'creditDonation') ? '+' : '-';
                        
                        const bookingName = transaction.booking ? 
                          (transaction.booking.title || transaction.booking.courseName) : '-';

                        const isGuestTransaction = transaction.description?.includes('(외부게스트:');
                        const guestName = isGuestTransaction 
                          ? transaction.description.match(/\(외부게스트:\s*([^)]+)\)/)?.[1] 
                          : null;

                        let categoryName = '';
                        if (transaction.type === 'payment') {
                          const paymentDesc = transaction.description || '회비 납부';
                          if (paymentDesc.includes(' - ')) {
                            categoryName = paymentDesc.split(' - ')[0];
                          } else if (paymentDesc.includes(' (')) {
                            categoryName = paymentDesc.split(' (')[0];
                          } else {
                            categoryName = paymentDesc;
                          }
                        } else if (transaction.type === 'expense') {
                          if (transaction.category === '크레딧 차감') {
                            categoryName = `${transaction.description || '참가비'} 청구`;
                          } else if (transaction.category === '크레딧 자동 차감') {
                            const baseName = transaction.description?.replace(' (크레딧 자동 차감)', '') || '참가비';
                            categoryName = `${baseName} (크레딧 사용)`;
                          } else {
                            categoryName = transaction.category || transaction.description || '클럽 지출';
                          }
                        } else if (transaction.type === 'donation') {
                          if (transaction.description?.includes('(크레딧사용)')) {
                            categoryName = transaction.description;
                          } else if (transaction.description?.startsWith('기타 - ')) {
                            categoryName = transaction.description.replace('기타 - ', '');
                          } else {
                            categoryName = transaction.category || '도네이션';
                          }
                        } else if (transaction.type === 'creditDonation') {
                          categoryName = transaction.description || '크레딧 도네이션';
                        } else if (transaction.type === 'credit') {
                          categoryName = transaction.description || transaction.category || '크레딧 지급';
                        } else {
                          categoryName = transaction.type;
                        }

                        return (
                          <tr 
                            key={transaction.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)'
                            }}
                          >
                            <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>
                              {new Date(transaction.date).toLocaleDateString('ko-KR', { 
                                month: 'numeric', 
                                day: 'numeric' 
                              })}
                            </td>
                            <td style={{ 
                              padding: '6px 4px', 
                              whiteSpace: 'nowrap', 
                              maxWidth: '80px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis',
                              color: isGuestTransaction ? '#4A90A4' : 'inherit'
                            }}>
                              {isGuestTransaction && guestName ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  {guestName}
                                  <span style={{
                                    fontSize: '9px',
                                    fontWeight: '600',
                                    background: '#87CEEB',
                                    color: '#1a3a4a',
                                    padding: '1px 4px',
                                    borderRadius: '3px'
                                  }}>G</span>
                                </span>
                              ) : (
                                transaction.member?.nickname || transaction.member?.name || '-'
                              )}
                            </td>
                            <td style={{ padding: '6px 4px' }}>
                              <div style={{ 
                                maxWidth: '200px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {categoryName}
                              </div>
                            </td>
                            <td style={{ 
                              padding: '6px 4px', 
                              textAlign: 'right',
                              fontWeight: '600',
                              color: typeColor,
                              whiteSpace: 'nowrap'
                            }}>
                              {(transaction.hasReceipt || transaction.receiptImage) ? (
                                <span
                                  onClick={async () => {
                                    try {
                                      const details = await apiService.fetchTransactionDetails(transaction.id);
                                      if (details.receiptImage) {
                                        setShowReceiptModal(details.receiptImage);
                                      } else if (details.receiptImages?.length > 0) {
                                        setShowReceiptModal(details.receiptImages[0]);
                                      }
                                    } catch (e) { console.error(e); }
                                  }}
                                  style={{
                                    cursor: 'pointer',
                                    textDecoration: 'underline',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  title="영수증 보기"
                                >
                                  {sign}${transaction.amount.toLocaleString()}
                                  <span style={{ fontSize: '10px' }}>📎</span>
                                </span>
                              ) : (
                                <span>
                                  {sign}${transaction.amount.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '6px 4px 6px 16px', whiteSpace: 'nowrap' }}>
                              {bookingName}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div>
            {/* 항목별 합계 섹션 */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    항목별 집계
                  </h3>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: 'var(--primary-green)',
                    background: 'var(--bg-green)',
                    padding: '4px 10px',
                    borderRadius: '6px'
                  }}>
                    클럽잔액: ${clubBalance.toLocaleString()}
                  </div>
                </div>
                {(selectedSummaryCategories.length > 0 || ledgerFilter.memberId !== 'all') && (
                  <button
                    onClick={() => {
                      setSelectedSummaryCategories([]);
                      setLedgerFilter({ ...ledgerFilter, memberId: 'all' });
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '12px',
                      background: 'var(--alert-red)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    선택 해제
                  </button>
                )}
              </div>
              <select
                value={summaryBookingFilter}
                onChange={(e) => {
                  const newBookingId = e.target.value;
                  setSummaryBookingFilter(newBookingId);
                  loadLedgerData(1, ledgerFilter.showCharges, ledgerFilter.memberId, newBookingId, true);
                }}
                style={{ 
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  width: '100%',
                  marginBottom: '16px'
                }}
              >
                <option value="all">전체 라운딩</option>
                {ledgerBookings.map(booking => (
                  <option key={booking.id} value={booking.id}>
                    {booking.title || booking.courseName}
                  </option>
                ))}
              </select>
              
              {(() => {
                // 서버 통계 사용 (전체 라운딩 필터 시)
                let incomeTotals = {};
                let expenseTotals = {};
                
                if (summaryBookingFilter === 'all') {
                  // 서버에서 집계된 전체 통계 사용
                  incomeTotals = ledgerStats.income || {};
                  expenseTotals = ledgerStats.expense || {};
                } else {
                  // 특정 라운딩 필터 시 현재 페이지 데이터에서 계산 (제한적)
                  const filteredForSummary = allTransactions.filter(t => 
                    t.bookingId === summaryBookingFilter
                  );
                  
                  // 수입 합계 계산 (payment, donation)
                  filteredForSummary.filter(t => t.type === 'payment').forEach(t => {
                    const paymentDesc = t.description || '회비 납부';
                    let catName = paymentDesc;
                    if (paymentDesc.includes(' - ')) {
                      catName = paymentDesc.split(' - ')[0];
                    } else if (paymentDesc.includes(' (')) {
                      catName = paymentDesc.split(' (')[0];
                    }
                    incomeTotals[catName] = (incomeTotals[catName] || 0) + t.amount;
                  });
                  filteredForSummary.filter(t => t.type === 'donation').forEach(t => {
                    let catName = '도네이션';
                    if (t.category === '크레딧 참가비' && t.description) {
                      const parts = t.description.split(' - ');
                      catName = parts[0].replace('청구', '') || '도네이션';
                    } else if (t.description?.startsWith('기타 - ')) {
                      catName = t.description.replace('기타 - ', '');
                    }
                    incomeTotals[catName] = (incomeTotals[catName] || 0) + t.amount;
                  });
                  
                  // 지출 합계 계산 (expense)
                  filteredForSummary.filter(t => t.type === 'expense').forEach(t => {
                    const catName = t.category || t.description || '기타 지출';
                    expenseTotals[catName] = (expenseTotals[catName] || 0) + t.amount;
                  });
                }
                
                const totalIncome = Object.values(incomeTotals).reduce((sum, val) => sum + val, 0);
                const totalExpense = Object.values(expenseTotals).reduce((sum, val) => sum + val, 0);
                
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    {/* 수입 섹션 */}
                    <div style={{ 
                      background: 'var(--bg-green)', 
                      borderRadius: '8px', 
                      padding: '16px',
                      border: '1px solid var(--primary-green)'
                    }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: '700', 
                        marginBottom: '12px',
                        color: 'var(--primary-green)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>수입</span>
                        <span style={{ fontSize: '16px' }}>${totalIncome.toLocaleString()}</span>
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.keys(incomeTotals).length === 0 ? (
                          <div style={{ opacity: 0.6, fontSize: '13px' }}>수입 내역이 없습니다</div>
                        ) : (
                          Object.entries(incomeTotals).map(([category, amount]) => (
                            <div 
                              key={category}
                              onClick={() => {
                                const catKey = `income:${category}`;
                                setSelectedSummaryCategories(prev => 
                                  prev.includes(catKey) 
                                    ? prev.filter(c => c !== catKey)
                                    : [...prev, catKey]
                                );
                              }}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: '13px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedSummaryCategories.includes(`income:${category}`) 
                                  ? 'var(--primary-green)' 
                                  : 'transparent',
                                color: selectedSummaryCategories.includes(`income:${category}`) 
                                  ? 'white' 
                                  : 'inherit',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <span>{category}</span>
                              <span style={{ 
                                fontWeight: '600', 
                                color: selectedSummaryCategories.includes(`income:${category}`) 
                                  ? 'white' 
                                  : 'var(--success-green)' 
                              }}>
                                +${amount.toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    
                    {/* 지출 섹션 */}
                    <div style={{ 
                      background: '#fff5f5', 
                      borderRadius: '8px', 
                      padding: '16px',
                      border: '1px solid var(--alert-red)'
                    }}>
                      <h4 style={{ 
                        fontSize: '15px', 
                        fontWeight: '700', 
                        marginBottom: '12px',
                        color: 'var(--alert-red)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>지출</span>
                        <span style={{ fontSize: '16px' }}>${totalExpense.toLocaleString()}</span>
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.keys(expenseTotals).length === 0 ? (
                          <div style={{ opacity: 0.6, fontSize: '13px' }}>지출 내역이 없습니다</div>
                        ) : (
                          Object.entries(expenseTotals).map(([category, amount]) => (
                            <div 
                              key={category}
                              onClick={() => {
                                const catKey = `expense:${category}`;
                                setSelectedSummaryCategories(prev => 
                                  prev.includes(catKey) 
                                    ? prev.filter(c => c !== catKey)
                                    : [...prev, catKey]
                                );
                              }}
                              style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between',
                                fontSize: '13px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: selectedSummaryCategories.includes(`expense:${category}`) 
                                  ? 'var(--alert-red)' 
                                  : 'transparent',
                                color: selectedSummaryCategories.includes(`expense:${category}`) 
                                  ? 'white' 
                                  : 'inherit',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <span>{category}</span>
                              <span style={{ 
                                fontWeight: '600', 
                                color: selectedSummaryCategories.includes(`expense:${category}`) 
                                  ? 'white' 
                                  : 'var(--alert-red)' 
                              }}>
                                -${amount.toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
              
              <select
                value={ledgerFilter.memberId}
                onChange={(e) => {
                  const newMemberId = e.target.value;
                  setLedgerFilter({ ...ledgerFilter, memberId: newMemberId });
                  loadLedgerData(1, ledgerFilter.showCharges, newMemberId);
                }}
                style={{ 
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  width: '100%',
                  marginTop: '16px'
                }}
              >
                <option value="all">전체 회원</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.nickname})
                  </option>
                ))}
              </select>

              <div 
                onClick={() => {
                  const newShowCharges = !ledgerFilter.showCharges;
                  setLedgerFilter({ ...ledgerFilter, showCharges: newShowCharges });
                  loadLedgerData(1, newShowCharges, ledgerFilter.memberId);
                }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginTop: '12px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: ledgerFilter.showCharges ? 'var(--bg-green)' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '4px',
                  border: `2px solid ${ledgerFilter.showCharges ? 'var(--primary-green)' : '#ccc'}`,
                  backgroundColor: ledgerFilter.showCharges ? 'var(--primary-green)' : 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {ledgerFilter.showCharges && '✓'}
                </div>
                <span style={{ fontSize: '14px' }}>청구 내역 포함</span>
              </div>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  거래 내역 ({
                    allTransactions
                      .filter(t => {
                        // GLOBAL: Always hide creditDonation in Club Tab
                        if (t.type === 'creditDonation') return false;
                        
                        if (ledgerFilter.showCharges) return true;
                        
                        if (t.type === 'charge') return false;
                        if (t.type === 'expense' && t.category) {
                          const cat = t.category;
                          if (cat.includes('크레딧') && (cat.includes('차감') || cat.includes('납부'))) return false;
                        }
                        return true;
                      })
                      .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                      .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                      .filter(t => summaryBookingFilter === 'all' || t.bookingId === summaryBookingFilter)
                      .filter(t => {
                        if (selectedSummaryCategories.length === 0) return true;
                        
                        let catKey = '';
                        if (t.type === 'payment') {
                          const paymentDesc = t.description || '회비 납부';
                          let catName = paymentDesc;
                          if (paymentDesc.includes(' - ')) {
                            catName = paymentDesc.split(' - ')[0];
                          } else if (paymentDesc.includes(' (')) {
                            catName = paymentDesc.split(' (')[0];
                          }
                          catKey = `income:${catName}`;
                        } else if (t.type === 'donation') {
                          if (t.category === '크레딧 참가비' && t.description) {
                            const parts = t.description.split(' - ');
                            const baseName = parts[0].replace('청구', '') || '도네이션';
                            catKey = `income:${baseName}`;
                          } else if (t.description?.startsWith('기타 - ')) {
                            catKey = `income:${t.description.replace('기타 - ', '')}`;
                          } else {
                            catKey = 'income:도네이션';
                          }
                        } else if (t.type === 'expense') {
                          const catName = t.category || t.description || '기타 지출';
                          catKey = `expense:${catName}`;
                        } else if (t.type === 'charge') {
                          catKey = 'charge:청구';
                        }
                        
                        return selectedSummaryCategories.includes(catKey);
                      })
                      .length
                  }건)
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hasFeaturePermission('delete_transaction') && (
                    <>
                      {isTransactionSelectMode ? (
                        <>
                          {selectedTransactionIds.length === 1 && (
                            <>
                              <button
                                onClick={() => {
                                  const transaction = allTransactions.find(t => t.id === selectedTransactionIds[0]);
                                  if (transaction) {
                                    setViewingTransaction(transaction);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: '#6366f1',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                상세
                              </button>
                              <button
                                onClick={() => {
                                  const transaction = allTransactions.find(t => t.id === selectedTransactionIds[0]);
                                  if (transaction) {
                                    setEditingTransaction(transaction);
                                  }
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: 'var(--primary-green)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '6px',
                                  fontSize: '13px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                수정
                              </button>
                            </>
                          )}
                          {selectedTransactionIds.length >= 1 && (
                            <button
                              onClick={async () => {
                                console.log('🗑️ Delete button clicked, IDs:', selectedTransactionIds);
                                if (!window.confirm(`선택한 ${selectedTransactionIds.length}건의 거래를 삭제하시겠습니까?`)) {
                                  console.log('❌ User cancelled deletion');
                                  return;
                                }
                                console.log('✅ User confirmed deletion');
                                try {
                                  for (const id of selectedTransactionIds) {
                                    console.log('🗑️ Deleting:', id);
                                    await apiService.deleteTransaction(id);
                                  }
                                  console.log('✅ All deletions complete');
                                  setAllTransactions(prev => prev.filter(t => !selectedTransactionIds.includes(t.id)));
                                  setSelectedTransactionIds([]);
                                  setIsTransactionSelectMode(false);
                                  loadLedgerData();
                                } catch (error) {
                                  console.error('Failed to delete transactions:', error);
                                  alert('삭제에 실패했습니다.');
                                }
                              }}
                              style={{
                                padding: '6px 12px',
                                background: 'var(--alert-red)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              삭제 ({selectedTransactionIds.length})
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setIsTransactionSelectMode(false);
                              setSelectedTransactionIds([]);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'var(--border-color)',
                              color: 'var(--text-primary)',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '13px',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setIsTransactionSelectMode(true)}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--primary-green)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          선택
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isLoadingTransactions ? (
                <div style={{ 
                  padding: '40px',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    border: '4px solid var(--border-color)',
                    borderTop: '4px solid var(--primary-green)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                  <p style={{ color: 'var(--text-secondary)' }}>거래내역 불러오는 중...</p>
                </div>
              ) : allTransactions
                .filter(t => {
                  // GLOBAL: Always hide creditDonation in Club Tab
                  if (t.type === 'creditDonation') return false;
                  
                  if (ledgerFilter.showCharges) return true;
                  
                  if (t.type === 'charge') return false;
                  if (t.type === 'expense' && t.category) {
                    const cat = t.category;
                    if (cat.includes('크레딧') && (cat.includes('차감') || cat.includes('납부'))) return false;
                  }
                  return true;
                })
                .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                .filter(t => summaryBookingFilter === 'all' || t.bookingId === summaryBookingFilter)
                .filter(t => {
                  if (selectedSummaryCategories.length === 0) return true;
                  
                  let catKey = '';
                  if (t.type === 'payment') {
                    const paymentDesc = t.description || '회비 납부';
                    let catName = paymentDesc;
                    if (paymentDesc.includes(' - ')) {
                      catName = paymentDesc.split(' - ')[0];
                    } else if (paymentDesc.includes(' (')) {
                      catName = paymentDesc.split(' (')[0];
                    }
                    catKey = `income:${catName}`;
                  } else if (t.type === 'donation') {
                    if (t.category === '크레딧 참가비' && t.description) {
                      const parts = t.description.split(' - ');
                      const baseName = parts[0].replace('청구', '') || '도네이션';
                      catKey = `income:${baseName}`;
                    } else if (t.description?.startsWith('기타 - ')) {
                      catKey = `income:${t.description.replace('기타 - ', '')}`;
                    } else {
                      catKey = 'income:도네이션';
                    }
                  } else if (t.type === 'expense') {
                    const catName = t.category || t.description || '기타 지출';
                    catKey = `expense:${catName}`;
                  } else if (t.type === 'charge') {
                    catKey = 'charge:청구';
                  } else if (t.type === 'creditDonation') {
                    catKey = 'expense:크레딧 도네이션';
                  }
                  
                  return selectedSummaryCategories.includes(catKey);
                })
                .length === 0 ? (
                <div style={{ 
                  padding: '40px',
                  textAlign: 'center',
                  opacity: 0.7
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
                  <p>조건에 맞는 거래가 없습니다</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '12px'
                  }}>
                    <thead>
                      <tr style={{
                        background: 'var(--bg-green)',
                        borderBottom: '2px solid var(--primary-green)'
                      }}>
                        {isTransactionSelectMode && (
                          <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', width: '40px' }}>
                            <input
                              type="checkbox"
                              checked={(() => {
                                const filteredIds = allTransactions
                                  .filter(t => {
                                    // GLOBAL: Always hide creditDonation in Club Tab
                                    if (t.type === 'creditDonation') return false;
                                    
                                    if (ledgerFilter.showCharges) return true;
                                    
                                    if (t.type === 'charge') return false;
                                    if (t.type === 'expense' && t.category) {
                                      const cat = t.category;
                                      if (cat.includes('크레딧') && (cat.includes('차감') || cat.includes('납부'))) return false;
                                    }
                                    return true;
                                  })
                                  .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                                  .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                                  .filter(t => summaryBookingFilter === 'all' || t.bookingId === summaryBookingFilter)
                                  .filter(t => {
                                    if (selectedSummaryCategories.length === 0) return true;
                                    let catKey = '';
                                    if (t.type === 'payment') {
                                      const paymentDesc = t.description || '회비 납부';
                                      let catName = paymentDesc;
                                      if (paymentDesc.includes(' - ')) {
                                        catName = paymentDesc.split(' - ')[0];
                                      } else if (paymentDesc.includes(' (')) {
                                        catName = paymentDesc.split(' (')[0];
                                      }
                                      catKey = `income:${catName}`;
                                    } else if (t.type === 'donation') {
                                      if (t.category === '크레딧 참가비' && t.description) {
                                        const parts = t.description.split(' - ');
                                        const baseName = parts[0].replace('청구', '') || '도네이션';
                                        catKey = `income:${baseName}`;
                                      } else if (t.description?.startsWith('기타 - ')) {
                                        catKey = `income:${t.description.replace('기타 - ', '')}`;
                                      } else {
                                        catKey = 'income:도네이션';
                                      }
                                    } else if (t.type === 'expense') {
                                      const catName = t.category || t.description || '기타 지출';
                                      catKey = `expense:${catName}`;
                                    } else if (t.type === 'charge') {
                                      catKey = 'charge:청구';
                                    }
                                    return selectedSummaryCategories.includes(catKey);
                                  })
                                  .map(t => t.id);
                                return filteredIds.length > 0 && filteredIds.every(id => selectedTransactionIds.includes(id));
                              })()}
                              onChange={(e) => {
                                const filteredIds = allTransactions
                                  .filter(t => {
                                    // GLOBAL: Always hide creditDonation in Club Tab
                                    if (t.type === 'creditDonation') return false;
                                    
                                    if (ledgerFilter.showCharges) return true;
                                    
                                    if (t.type === 'charge') return false;
                                    if (t.type === 'expense' && t.category) {
                                      const cat = t.category;
                                      if (cat.includes('크레딧') && (cat.includes('차감') || cat.includes('납부'))) return false;
                                    }
                                    return true;
                                  })
                                  .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                                  .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                                  .filter(t => summaryBookingFilter === 'all' || t.bookingId === summaryBookingFilter)
                                  .filter(t => {
                                    if (selectedSummaryCategories.length === 0) return true;
                                    let catKey = '';
                                    if (t.type === 'payment') {
                                      const paymentDesc = t.description || '회비 납부';
                                      let catName = paymentDesc;
                                      if (paymentDesc.includes(' - ')) {
                                        catName = paymentDesc.split(' - ')[0];
                                      } else if (paymentDesc.includes(' (')) {
                                        catName = paymentDesc.split(' (')[0];
                                      }
                                      catKey = `income:${catName}`;
                                    } else if (t.type === 'donation') {
                                      if (t.category === '크레딧 참가비' && t.description) {
                                        const parts = t.description.split(' - ');
                                        const baseName = parts[0].replace('청구', '') || '도네이션';
                                        catKey = `income:${baseName}`;
                                      } else if (t.description?.startsWith('기타 - ')) {
                                        catKey = `income:${t.description.replace('기타 - ', '')}`;
                                      } else {
                                        catKey = 'income:도네이션';
                                      }
                                    } else if (t.type === 'expense') {
                                      const catName = t.category || t.description || '기타 지출';
                                      catKey = `expense:${catName}`;
                                    } else if (t.type === 'charge') {
                                      catKey = 'charge:청구';
                                    }
                                    return selectedSummaryCategories.includes(catKey);
                                  })
                                  .map(t => t.id);
                                if (e.target.checked) {
                                  setSelectedTransactionIds(prev => [...new Set([...prev, ...filteredIds])]);
                                } else {
                                  setSelectedTransactionIds(prev => prev.filter(id => !filteredIds.includes(id)));
                                }
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                          </th>
                        )}
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>날짜</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>회원</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>항목</th>
                        <th style={{ padding: '6px 4px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>금액</th>
                        <th style={{ padding: '6px 4px 6px 16px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>라운딩</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTransactions
                        .filter(t => {
                          // GLOBAL: Always hide creditDonation in Club Tab
                          if (t.type === 'creditDonation') return false;
                          
                          // IF checkbox is CHECKED (showCharges === true): Show charges and expenses
                          if (ledgerFilter.showCharges) {
                            return true;
                          }
                          
                          // IF checkbox is UNCHECKED (Clean View): Apply filters
                          if (t.type === 'charge') return false;
                          if (t.type === 'expense' && t.category) {
                            const cat = t.category;
                            if (cat.includes('크레딧') && (cat.includes('차감') || cat.includes('납부'))) {
                              return false;
                            }
                          }
                          
                          return true;
                        })
                        .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                        .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                        .filter(t => summaryBookingFilter === 'all' || t.bookingId === summaryBookingFilter)
                        .filter(t => {
                          if (selectedSummaryCategories.length === 0) return true;
                          
                          let catKey = '';
                          if (t.type === 'payment') {
                            const paymentDesc = t.description || '회비 납부';
                            let catName = paymentDesc;
                            if (paymentDesc.includes(' - ')) {
                              catName = paymentDesc.split(' - ')[0];
                            } else if (paymentDesc.includes(' (')) {
                              catName = paymentDesc.split(' (')[0];
                            }
                            catKey = `income:${catName}`;
                          } else if (t.type === 'donation') {
                            if (t.category === '크레딧 참가비' && t.description) {
                              const parts = t.description.split(' - ');
                              const baseName = parts[0].replace('청구', '') || '도네이션';
                              catKey = `income:${baseName}`;
                            } else if (t.description?.startsWith('기타 - ')) {
                              catKey = `income:${t.description.replace('기타 - ', '')}`;
                            } else {
                              catKey = 'income:도네이션';
                            }
                          } else if (t.type === 'expense') {
                            const catName = t.category || t.description || '기타 지출';
                            catKey = `expense:${catName}`;
                          } else if (t.type === 'charge') {
                            catKey = 'charge:청구';
                          } else if (t.type === 'creditDonation') {
                            catKey = 'expense:크레딧 도네이션';
                          }
                          
                          return selectedSummaryCategories.includes(catKey);
                        })
                        .map(transaction => {
                          // Club Tab: expense, charge, credit are negative (money going out from club)
                          const typeColor =
                            transaction.type === 'payment' ? 'var(--success-green)' :
                            transaction.type === 'donation' ? 'var(--success-green)' :
                            transaction.type === 'creditDonation' ? 'var(--success-green)' :
                            transaction.type === 'charge' ? 'var(--alert-red)' :
                            transaction.type === 'expense' ? 'var(--alert-red)' :
                            transaction.type === 'credit' ? 'var(--alert-red)' :
                            'var(--success-green)';

                          // Club Tab: expense, charge, credit are negative (club pays out)
                          const sign = 
                            (transaction.type === 'payment' || transaction.type === 'donation' || transaction.type === 'creditDonation') ? '+' : '-';
                          
                          const bookingName = transaction.booking ? 
                            (transaction.booking.title || transaction.booking.courseName) : '-';

                          const isGuestTx = transaction.description?.includes('(외부게스트:');
                          const guestTxName = isGuestTx 
                            ? transaction.description.match(/\(외부게스트:\s*([^)]+)\)/)?.[1] 
                            : null;

                          let categoryName = '';
                          if (transaction.type === 'payment') {
                            const paymentDesc = transaction.description || '회비 납부';
                            if (paymentDesc.includes(' - ')) {
                              categoryName = paymentDesc.split(' - ')[0];
                            } else if (paymentDesc.includes(' (')) {
                              categoryName = paymentDesc.split(' (')[0];
                            } else {
                              categoryName = paymentDesc;
                            }
                          } else if (transaction.type === 'expense') {
                            if (transaction.category === '크레딧 차감') {
                              categoryName = `${transaction.description || '참가비'} 청구`;
                            } else if (transaction.category === '크레딧 자동 차감') {
                              const baseName = transaction.description?.replace(' (크레딧 자동 차감)', '') || '참가비';
                              categoryName = `${baseName} (크레딧 사용)`;
                            } else {
                              categoryName = transaction.category || transaction.description || '클럽 지출';
                            }
                          } else if (transaction.type === 'donation') {
                            if (transaction.description?.includes('(크레딧사용)')) {
                              categoryName = transaction.description;
                            } else if (transaction.description?.startsWith('기타 - ')) {
                              categoryName = transaction.description.replace('기타 - ', '');
                            } else {
                              categoryName = transaction.category || '도네이션';
                            }
                          } else if (transaction.type === 'charge') {
                            const chargeDesc = transaction.description || '참가비청구';
                            if (chargeDesc.includes(' - ')) {
                              categoryName = chargeDesc.split(' - ')[0];
                            } else {
                              categoryName = chargeDesc;
                            }
                          } else if (transaction.type === 'creditDonation') {
                            categoryName = transaction.description || '크레딧 도네이션';
                          } else if (transaction.type === 'credit') {
                            categoryName = transaction.description || transaction.category || '크레딧 지급';
                          } else {
                            categoryName = transaction.type;
                          }

                          return (
                            <tr 
                              key={transaction.id}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: selectedTransactionIds.includes(transaction.id) ? 'var(--bg-green)' : 'transparent'
                              }}
                            >
                              {isTransactionSelectMode && (
                                <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedTransactionIds.includes(transaction.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedTransactionIds(prev => [...prev, transaction.id]);
                                      } else {
                                        setSelectedTransactionIds(prev => prev.filter(id => id !== transaction.id));
                                      }
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                  />
                                </td>
                              )}
                              <td style={{ padding: '6px 4px', whiteSpace: 'nowrap' }}>
                                {new Date(transaction.date).toLocaleDateString('ko-KR', { 
                                  month: 'numeric', 
                                  day: 'numeric' 
                                })}
                              </td>
                              <td style={{ 
                                padding: '6px 4px', 
                                whiteSpace: 'nowrap', 
                                maxWidth: '80px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                color: isGuestTx ? '#4A90A4' : 'inherit'
                              }}>
                                {isGuestTx && guestTxName ? (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {guestTxName}
                                    <span style={{
                                      fontSize: '9px',
                                      fontWeight: '600',
                                      background: '#87CEEB',
                                      color: '#1a3a4a',
                                      padding: '1px 4px',
                                      borderRadius: '3px'
                                    }}>G</span>
                                  </span>
                                ) : (
                                  transaction.member?.nickname || transaction.member?.name || '-'
                                )}
                              </td>
                              <td style={{ padding: '6px 4px' }}>
                                <div style={{ 
                                  maxWidth: '80px', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {categoryName}
                                </div>
                              </td>
                              <td style={{ 
                                padding: '6px 4px', 
                                textAlign: 'right',
                                fontWeight: '600',
                                color: typeColor,
                                whiteSpace: 'nowrap'
                              }}>
                                {(transaction.hasReceipt || transaction.receiptImage) ? (
                                  <span
                                    onClick={async () => {
                                      try {
                                        const details = await apiService.fetchTransactionDetails(transaction.id);
                                        if (details.receiptImage) {
                                          setShowReceiptModal(details.receiptImage);
                                        } else if (details.receiptImages?.length > 0) {
                                          setShowReceiptModal(details.receiptImages[0]);
                                        }
                                      } catch (e) { console.error(e); }
                                    }}
                                    style={{
                                      cursor: 'pointer',
                                      textDecoration: 'underline',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                    title="영수증 보기"
                                  >
                                    {sign}${transaction.amount.toLocaleString()}
                                    <span style={{ fontSize: '10px' }}>📎</span>
                                  </span>
                                ) : (
                                  <span>
                                    {sign}${transaction.amount.toLocaleString()}
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '6px 4px 6px 16px', whiteSpace: 'nowrap' }}>
                                {bookingName}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {/* 페이지네이션 */}
              {ledgerTotalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '12px', 
                  marginTop: '20px',
                  padding: '16px 0'
                }}>
                  <button
                    onClick={() => loadLedgerData(ledgerCurrentPage - 1, ledgerFilter.showCharges, ledgerFilter.memberId)}
                    disabled={ledgerCurrentPage <= 1}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--border-color)',
                      background: ledgerCurrentPage <= 1 ? '#f5f5f5' : 'white',
                      borderRadius: '6px',
                      cursor: ledgerCurrentPage <= 1 ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    이전
                  </button>
                  <span style={{ fontWeight: '600', fontSize: '14px' }}>
                    {ledgerCurrentPage} / {ledgerTotalPages}
                  </span>
                  <button
                    onClick={() => loadLedgerData(ledgerCurrentPage + 1, ledgerFilter.showCharges, ledgerFilter.memberId)}
                    disabled={ledgerCurrentPage >= ledgerTotalPages}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid var(--border-color)',
                      background: ledgerCurrentPage >= ledgerTotalPages ? '#f5f5f5' : 'white',
                      borderRadius: '6px',
                      cursor: ledgerCurrentPage >= ledgerTotalPages ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      fontSize: '14px'
                    }}
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'courses' && (() => {
          const PRIMARY = '#0047AB';
          const cyclePar = (val) => { const v = parseInt(val) || 4; return v >= 5 ? 3 : v + 1; };
          const parColor = (p) => p === 3 ? '#16A34A' : p === 5 ? '#C0392B' : '#0047AB';

          const ScorecardGrid = ({ pars, nearHoles, onParClick, onNearClick, readOnly = false }) => {
            const front = pars.slice(0, 9);
            const back = pars.slice(9, 18);
            const frontTotal = front.reduce((s, p) => s + (parseInt(p) || 0), 0);
            const backTotal = back.reduce((s, p) => s + (parseInt(p) || 0), 0);
            return (
              <div style={{ overflowX: 'auto' }}>
                {[front, back].map((half, hi) => (
                  <div key={hi} style={{ marginBottom: hi === 0 ? '10px' : '0' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '3px', minWidth: '300px' }}>
                      {/* 홀 번호 행 */}
                      {half.map((_, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '700', color: '#94A3B8', padding: '4px 2px' }}>
                          {hi * 9 + i + 1}
                        </div>
                      ))}
                      <div style={{ textAlign: 'center', fontSize: '10px', fontWeight: '700', color: '#94A3B8', padding: '4px 2px' }}>
                        {hi === 0 ? 'OUT' : 'IN'}
                      </div>
                      {/* 파 행 */}
                      {half.map((p, i) => {
                        const idx = hi * 9 + i;
                        return (
                          <button key={i} onClick={() => !readOnly && onParClick && onParClick(idx)}
                            style={{ textAlign: 'center', fontSize: '15px', fontWeight: '800', color: parColor(parseInt(p) || 4),
                              background: '#F8FAFC', border: '1.5px solid #E8ECF0', borderRadius: '8px', padding: '8px 2px',
                              cursor: readOnly ? 'default' : 'pointer', transition: 'all 0.1s' }}>
                            {p || '—'}
                          </button>
                        );
                      })}
                      <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '800', color: '#1E293B',
                        background: '#F1F5F9', border: '1.5px solid #E2E8F0', borderRadius: '8px', padding: '8px 2px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hi === 0 ? frontTotal : backTotal}
                      </div>
                      {/* 니어 행 */}
                      {half.map((_, i) => {
                        const idx = hi * 9 + i;
                        const isNear = nearHoles?.[idx];
                        return (
                          <button key={i} onClick={() => !readOnly && onNearClick && onNearClick(idx)}
                            style={{ textAlign: 'center', fontSize: '10px', fontWeight: '700',
                              color: isNear ? '#FFFFFF' : '#94A3B8',
                              background: isNear ? PRIMARY : '#F8FAFC',
                              border: `1.5px solid ${isNear ? PRIMARY : '#E8ECF0'}`,
                              borderRadius: '6px', padding: '4px 2px', cursor: readOnly ? 'default' : 'pointer' }}>
                            N
                          </button>
                        );
                      })}
                      <div style={{ textAlign: 'center', fontSize: '10px', color: '#CBD5E1', padding: '4px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>—</div>
                    </div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: '#94A3B8' }}>
                  <span style={{ color: '#16A34A', fontWeight: '700' }}>3</span>
                  <span style={{ color: '#0047AB', fontWeight: '700' }}>4</span>
                  <span style={{ color: '#C0392B', fontWeight: '700' }}>5</span>
                  <span>탭하여 변경</span>
                  <span style={{ marginLeft: '8px' }}>N = 니어핀</span>
                </div>
              </div>
            );
          };

          const openAddSheet = () => {
            setCourseSheetMode('add');
            setCourseSearchQuery('');
            setCourseSearchState('idle');
            setCourseSearchResult(null);
            setNewCourse({ name: '', address: '', maleHolePars: Array(18).fill(4), femaleHolePars: Array(18).fill(4), nearHoles: Array(18).fill(false), isCompetition: false });
            setCourseSheetOpen(true);
          };

          const openEditSheet = (course) => {
            setCourseSheetMode('edit');
            handleEditCourse(course);
            setCourseSheetOpen(true);
            setShowCourseMenu(null);
          };

          const closeSheet = () => {
            setCourseSheetOpen(false);
            setEditingCourse(null);
            setEditCourseData(null);
            setCourseSearchState('idle');
            setCourseSearchResult(null);
          };

          const handleCourseSearch = async () => {
            if (!courseSearchQuery.trim()) return;
            setCourseSearchState('searching');
            setCourseSearchResult(null);
            try {
              const result = await apiService.searchCourse(courseSearchQuery.trim());
              const malePars = (result.holePars?.male || []).map(p => parseInt(p) || 4);
              const femalePars = (result.holePars?.female || []).map(p => parseInt(p) || 4);
              setCourseSearchResult(result);
              const courseData = {
                name: result.name || courseSearchQuery,
                address: result.address || '',
                maleHolePars: malePars,
                femaleHolePars: femalePars,
                nearHoles: Array(18).fill(false),
                isCompetition: false,
              };
              setNewCourse(prev => ({ ...prev, ...courseData }));
              setEditCourseData(courseData);
              setCourseSearchState('found');
            } catch {
              setCourseSearchState('error');
            }
          };

          const handleConfirmAdd = async () => {
            if (!editCourseData) return;
            // editCourseData로 newCourse 동기화 후 저장
            setNewCourse({
              name: editCourseData.name,
              address: editCourseData.address || '',
              maleHolePars: editCourseData.maleHolePars,
              femaleHolePars: editCourseData.femaleHolePars,
              nearHoles: editCourseData.nearHoles,
              isCompetition: editCourseData.isCompetition,
            });
            await apiService.createCourse({
              name: editCourseData.name,
              address: editCourseData.address || '',
              holePars: {
                male: editCourseData.maleHolePars.map(p => parseInt(p) || 4),
                female: editCourseData.femaleHolePars.map(p => parseInt(p) || 4),
              },
              nearHoles: editCourseData.nearHoles,
              isCompetition: editCourseData.isCompetition,
            });
            if (refreshCourses) await refreshCourses();
            closeSheet();
          };

          const handleConfirmEdit = async () => {
            await handleSaveCourseEdit();
            closeSheet();
          };

          const handleDeleteAndClose = async (courseId) => {
            await handleDeleteCourse(courseId);
            closeSheet();
          };

          const filteredCourses = courseListSearch.trim()
            ? courses.filter(c => {
                const q = courseListSearch.trim().toLowerCase();
                return (c.name || '').toLowerCase().includes(q) || (c.address || '').toLowerCase().includes(q);
              })
            : courses;

          return (
          <div>
            {/* ── 검색창 ── */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="골프장 이름 또는 지역 검색"
                  value={courseListSearch}
                  onChange={e => setCourseListSearch(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '12px 36px 12px 42px',
                    border: 'none', borderRadius: '14px',
                    fontSize: '14px', color: '#1E293B', background: '#FFFFFF',
                    outline: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                />
                {courseListSearch && (
                  <button onClick={() => setCourseListSearch('')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94A3B8', fontSize: 14, fontWeight: 700 }}>
                    ×
                  </button>
                )}
              </div>
              <button onClick={openAddSheet}
                style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 14, background: PRIMARY, color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,71,171,0.25)', fontSize: 22, fontWeight: 300 }}>
                +
              </button>
            </div>

            {/* ── COURSE DIRECTORY 헤더 ── */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.12em', marginBottom: 4 }}>COURSE DIRECTORY</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1E293B' }}>
                전체 <span style={{ color: PRIMARY }}>{courseListSearch.trim() ? `${filteredCourses.length}` : courses.length}개</span>
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 20px', color: '#94A3B8', fontSize: '14px', background: '#FFFFFF', borderRadius: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '36px', marginBottom: '10px' }}>⛳</div>
                {courses.length === 0
                  ? <><div>등록된 골프장이 없습니다</div><div style={{ marginTop: '6px', fontSize: '12px' }}>+ 버튼을 눌러 등록하세요</div></>
                  : <div>"{courseListSearch}"에 해당하는 골프장이 없습니다</div>
                }
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {filteredCourses.map(course => {
                  const male = course.holePars?.male || [];
                  const totalPar = male.reduce((s, p) => s + (p || 0), 0);
                  const nearCount = (course.nearHoles || []).filter(Boolean).length;
                  // 이니셜 (이미지 없을 때 플레이스홀더)
                  const initials = (course.name || '').slice(0, 2).toUpperCase();
                  // 이니셜 배경색 (이름 기반 고정색)
                  const hue = [...(course.name || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
                  return (
                    <div key={course.id} onClick={() => openEditSheet(course)}
                      style={{ background: '#FFFFFF', borderRadius: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '12px 14px 12px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
                      {/* 썸네일 */}
                      <div style={{ width: 64, height: 64, borderRadius: 14, flexShrink: 0, overflow: 'hidden', background: course.courseImage ? 'transparent' : `hsl(${hue},45%,55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {course.courseImage
                          ? <img src={course.courseImage} alt={course.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>{initials}</span>
                        }
                      </div>
                      {/* 정보 */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.name}</span>
                          {course.isCompetition && (
                            <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff', background: PRIMARY, borderRadius: '4px', padding: '2px 6px', flexShrink: 0 }}>컴페티션</span>
                          )}
                        </div>
                        {course.address && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748B' }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#94A3B8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.address}</span>
                          </div>
                        )}
                        {nearCount > 0 && (
                          <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>니어핀 {nearCount}홀</div>
                        )}
                      </div>
                      {/* PAR 배지 + 화살표 */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                        {totalPar > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 800, color: PRIMARY, background: '#EFF6FF', borderRadius: 8, padding: '3px 8px', letterSpacing: '0.04em' }}>
                            PAR {totalPar}
                          </span>
                        )}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── 바텀 시트 ── */}
            {courseSheetOpen && (
              <div style={{ position: 'fixed', inset: 0, zIndex: 3000 }}>
                {/* 딤 */}
                <div onClick={closeSheet} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} />
                {/* 시트 */}
                <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px',
                  background: '#F8FAFC', borderRadius: '20px 20px 0 0', maxHeight: '90vh', overflowY: 'auto', paddingBottom: '32px' }}>
                  {/* 핸들 */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: '40px', height: '4px', background: '#CBD5E1', borderRadius: '2px' }} />
                  </div>
                  {/* 헤더 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                        {courseSheetMode === 'add' ? 'NEW COURSE' : 'EDIT COURSE'}
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: '#1E293B' }}>
                        {courseSheetMode === 'add' ? '골프장 추가' : (editCourseData?.name || '')}
                      </div>
                    </div>
                    <button onClick={closeSheet}
                      style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F1F5F9', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', color: '#64748B' }}>
                      ×
                    </button>
                  </div>

                  <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* ─── ADD 모드: AI 검색 ─── */}
                    {courseSheetMode === 'add' && (
                      <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', padding: '16px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>골프장 이름으로 자동 검색</div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            value={courseSearchQuery}
                            onChange={e => setCourseSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCourseSearch()}
                            placeholder="예: Strathfield Golf Club"
                            style={{ flex: 1, padding: '11px 14px', borderRadius: '10px', border: '1px solid #E8ECF0', fontSize: '14px', outline: 'none', background: '#FAFBFC' }}
                          />
                          <button onClick={handleCourseSearch} disabled={courseSearchState === 'searching' || !courseSearchQuery.trim()}
                            style={{ padding: '11px 16px', borderRadius: '10px', background: PRIMARY, color: '#fff', border: 'none', fontWeight: '700', fontSize: '13px', cursor: 'pointer', opacity: courseSearchState === 'searching' || !courseSearchQuery.trim() ? 0.5 : 1, whiteSpace: 'nowrap' }}>
                            {courseSearchState === 'searching' ? '검색 중…' : 'AI 검색'}
                          </button>
                        </div>

                        {courseSearchState === 'error' && (
                          <div style={{ marginTop: '10px', fontSize: '13px', color: '#DC2626', background: '#FEF2F2', padding: '10px 12px', borderRadius: '8px' }}>
                            검색 실패. 서버의 .env에 ANTHROPIC_API_KEY를 확인하세요.
                          </div>
                        )}

                        {courseSearchState === 'found' && courseSearchResult && (
                          <div style={{ marginTop: '12px', background: '#EBF2FF', borderRadius: '10px', padding: '12px', border: '1px solid #BFDBFE' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: PRIMARY, marginBottom: '6px' }}>✓ 골프장 정보를 찾았습니다</div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>{courseSearchResult.name}</div>
                            {courseSearchResult.address && <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{courseSearchResult.address}</div>}
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                              Par {courseSearchResult.totalMale || (courseSearchResult.holePars?.male || []).reduce((s, p) => s + p, 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ─── EDIT 모드 OR ADD 검색 완료: 기본 정보 ─── */}
                    {(courseSheetMode === 'edit' || courseSearchState === 'found') && editCourseData && (
                      <>
                        <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', padding: '16px' }}>
                          <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B', marginBottom: '8px' }}>기본 정보</div>
                          <input value={editCourseData.name}
                            onChange={e => setEditCourseData({ ...editCourseData, name: e.target.value })}
                            placeholder="골프장 이름"
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E8ECF0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }} />
                          <input value={editCourseData.address || ''}
                            onChange={e => setEditCourseData({ ...editCourseData, address: e.target.value })}
                            placeholder="주소"
                            style={{ width: '100%', padding: '11px 14px', borderRadius: '10px', border: '1px solid #E8ECF0', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '12px' }} />
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1E293B' }}>컴페티션 골프장</div>
                              <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>대회 및 공식 경기용</div>
                            </div>
                            <button onClick={() => setEditCourseData(prev => ({ ...prev, isCompetition: !prev.isCompetition }))}
                              style={{ width: '46px', height: '26px', borderRadius: '13px', border: 'none', background: editCourseData.isCompetition ? PRIMARY : '#E2E8F0', cursor: 'pointer', position: 'relative', padding: 0 }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: editCourseData.isCompetition ? '23px' : '3px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
                            </button>
                          </div>
                        </div>

                        <div style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid #E8ECF0', padding: '16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748B' }}>홀별 PAR · 니어핀 설정</div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#1E293B' }}>
                              Total {editCourseData.maleHolePars.reduce((s, p) => s + (parseInt(p) || 0), 0)}
                            </div>
                          </div>
                          <ScorecardGrid
                            pars={editCourseData.maleHolePars}
                            nearHoles={editCourseData.nearHoles}
                            onParClick={(idx) => {
                              const next = [...editCourseData.maleHolePars];
                              next[idx] = cyclePar(next[idx]);
                              const nextF = [...editCourseData.femaleHolePars];
                              nextF[idx] = next[idx];
                              setEditCourseData({ ...editCourseData, maleHolePars: next, femaleHolePars: nextF });
                            }}
                            onNearClick={(idx) => {
                              const next = [...(editCourseData.nearHoles || Array(18).fill(false))];
                              next[idx] = !next[idx];
                              setEditCourseData({ ...editCourseData, nearHoles: next });
                            }}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', paddingBottom: '8px' }}>
                          {courseSheetMode === 'edit' && (
                            <button onClick={() => handleDeleteAndClose(editingCourse)}
                              style={{ padding: '14px 16px', borderRadius: '12px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}>
                              삭제
                            </button>
                          )}
                          <button onClick={courseSheetMode === 'add' ? handleConfirmAdd : handleConfirmEdit}
                            disabled={isSavingCourse || isAddingCourse}
                            style={{ flex: 1, padding: '14px', borderRadius: '12px', background: PRIMARY, color: '#fff', border: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer', opacity: (isSavingCourse || isAddingCourse) ? 0.6 : 1 }}>
                            {(isSavingCourse || isAddingCourse) ? '저장 중…' : courseSheetMode === 'add' ? '등록' : '저장'}
                          </button>
                        </div>
                      </>
                    )}

                    {/* ADD 모드: 검색 전 안내 */}
                    {courseSheetMode === 'add' && courseSearchState === 'idle' && (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#94A3B8', fontSize: '13px' }}>
                        골프장 이름을 입력하고 AI 검색을 누르면<br/>이름, 주소, 홀 정보가 자동으로 채워집니다.
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* placeholder to keep old code reference */}
        {false && activeTab === 'courses_old' && (
          <div>
            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                골프장 등록
              </h3>
              <input
                type="text"
                placeholder="골프장 이름"
                value={newCourse.name}
                onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })}
                style={{ marginBottom: '12px' }}
              />
              <input
                type="text"
                placeholder="주소"
                value={newCourse.address}
                onChange={(e) => setNewCourse({ ...newCourse, address: e.target.value })}
                style={{ marginBottom: '16px' }}
              />

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}>
                  <input
                    type="checkbox"
                    checked={newCourse.isCompetition}
                    onChange={(e) => setNewCourse({ ...newCourse, isCompetition: e.target.checked })}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: 'var(--primary-green)'
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                      이 골프장을 컴페티션용으로 사용하겠습니까?
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.7 }}>
                      컴페티션용 골프장은 대회 및 경기용으로 구분됩니다
                    </div>
                  </div>
                </label>
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                  각 홀별 PAR 설정
                </h4>
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  {newCourse.maleHolePars.map((par, index) => (
                    <div 
                      key={`hole-${index}`}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '60px 60px 60px 1fr',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        background: 'var(--bg-green)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '600',
                        color: 'var(--text-dark)'
                      }}>
                        {index + 1}홀
                      </div>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="남"
                        value={par}
                        onChange={(e) => handleHoleParChange(index, e.target.value, 'male')}
                        min="3"
                        max="6"
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          textAlign: 'center',
                          border: '1px solid var(--primary-green)',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="여"
                        value={newCourse.femaleHolePars[index]}
                        onChange={(e) => handleHoleParChange(index, e.target.value, 'female')}
                        min="3"
                        max="6"
                        style={{
                          width: '100%',
                          padding: '6px',
                          fontSize: '12px',
                          textAlign: 'center',
                          border: '1px solid #e74c3c',
                          borderRadius: '4px',
                          fontWeight: '600'
                        }}
                      />
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}>
                        <input
                          type="checkbox"
                          checked={newCourse.nearHoles[index] || false}
                          onChange={() => handleNearHoleChange(index)}
                          style={{
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: 'var(--primary-green)'
                          }}
                        />
                        <span style={{ fontSize: '12px', fontWeight: '600' }}>니어</span>
                      </label>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  marginTop: '12px', 
                  padding: '8px 12px',
                  background: 'var(--primary-green)',
                  color: 'var(--text-light)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  남자 총 PAR: {newCourse.maleHolePars.reduce((sum, par) => sum + (parseInt(par) || 0), 0)} / 여자 총 PAR: {newCourse.femaleHolePars.reduce((sum, par) => sum + (parseInt(par) || 0), 0)}
                </div>
              </div>

              <button className="btn-primary" onClick={handleAddCourse}>
                골프장 등록
              </button>
            </div>

            {editingCourse && editCourseData && (
              <div className="card" style={{ marginBottom: '16px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--primary-green)' }}>
                  ✎ 골프장 정보 수정
                </h3>
                <input
                  type="text"
                  placeholder="골프장 이름"
                  value={editCourseData.name}
                  onChange={(e) => setEditCourseData({ ...editCourseData, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="주소"
                  value={editCourseData.address}
                  onChange={(e) => setEditCourseData({ ...editCourseData, address: e.target.value })}
                  style={{ marginBottom: '16px' }}
                />

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: 'var(--bg-green)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}>
                    <input
                      type="checkbox"
                      checked={editCourseData.isCompetition || false}
                      onChange={(e) => setEditCourseData({ ...editCourseData, isCompetition: e.target.checked })}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: 'var(--primary-green)'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
                        이 골프장을 컴페티션용으로 사용하겠습니까?
                      </div>
                      <div style={{ fontSize: '13px', opacity: 0.7 }}>
                        컴페티션용 골프장은 대회 및 경기용으로 구분됩니다
                      </div>
                    </div>
                  </label>
                </div>
                
                <div style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                    각 홀별 PAR 설정
                  </h4>
                  <div style={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {editCourseData.maleHolePars.map((par, index) => (
                      <div 
                        key={`hole-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '60px 60px 60px 1fr',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          background: 'var(--bg-green)',
                          borderRadius: '6px'
                        }}
                      >
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: '600',
                          color: 'var(--text-dark)'
                        }}>
                          {index + 1}홀
                        </div>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="남"
                          value={par}
                          onChange={(e) => handleEditCourseHoleParChange(index, e.target.value, 'male')}
                          min="3"
                          max="6"
                          style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '12px',
                            textAlign: 'center',
                            border: '1px solid var(--primary-green)',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="여"
                          value={editCourseData.femaleHolePars[index]}
                          onChange={(e) => handleEditCourseHoleParChange(index, e.target.value, 'female')}
                          min="3"
                          max="6"
                          style={{
                            width: '100%',
                            padding: '6px',
                            fontSize: '12px',
                            textAlign: 'center',
                            border: '1px solid #e74c3c',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}
                        />
                        <label style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}>
                          <input
                            type="checkbox"
                            checked={editCourseData.nearHoles?.[index] || false}
                            onChange={() => handleEditNearHoleChange(index)}
                            style={{
                              width: '18px',
                              height: '18px',
                              cursor: 'pointer',
                              accentColor: 'var(--primary-green)'
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: '600' }}>니어</span>
                        </label>
                      </div>
                    ))}
                  </div>
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '8px 12px',
                    background: 'var(--primary-green)',
                    color: 'var(--text-light)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>
                    남자 총 PAR: {editCourseData.maleHolePars.reduce((sum, par) => sum + (parseInt(par) || 0), 0)} / 여자 총 PAR: {editCourseData.femaleHolePars.reduce((sum, par) => sum + (parseInt(par) || 0), 0)}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={handleCancelCourseEdit}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: '#BD5B43',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    취소하기
                  </button>
                  <button
                    onClick={handleSaveCourseEdit}
                    style={{
                      flex: 1,
                      padding: '14px 24px',
                      background: 'var(--primary-green)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            )}

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                등록된 골프장 ({courses.length})
              </h3>
              {courses.length === 0 ? (
                <div style={{ 
                  padding: '16px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--text-dark)', opacity: 0.7
                }}>
                  등록된 골프장이 없습니다
                </div>
              ) : (
                courses.map(course => (
                  <div 
                    key={course.id}
                    style={{
                      padding: '16px',
                      background: 'var(--bg-green)',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <div style={{ fontWeight: '700', fontSize: '16px' }}>
                            {course.name}
                          </div>
                          {course.isCompetition && (
                            <div style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: 'var(--primary-green)',
                              color: 'white',
                              fontWeight: '600'
                            }}>
                              컴페티션
                            </div>
                          )}
                        </div>
                        {course.address && (
                          <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7, marginBottom: '8px' }}>
                            • {course.address}
                          </div>
                        )}
                      </div>
                      
                      <div 
                        ref={(el) => (courseMenuRefs.current[course.id] = el)}
                        style={{ position: 'relative' }}
                      >
                        <button
                          onClick={() => setShowCourseMenu(showCourseMenu === course.id ? null : course.id)}
                          style={{
                            background: 'var(--bg-card)',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '18px',
                            fontWeight: '700',
                            color: 'var(--text-dark)', opacity: 0.7,
                            lineHeight: '1'
                          }}
                        >
                          ⋮
                        </button>
                        
                        {showCourseMenu === course.id && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              right: 0,
                              marginTop: '4px',
                              background: 'var(--bg-card)',
                              borderRadius: '8px',
                              zIndex: 1000,
                              minWidth: '150px',
                              overflow: 'hidden'
                            }}
                          >
                            <button
                              onClick={() => handleEditCourse(course)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'var(--bg-card)',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                borderBottom: '1px solid var(--border-color)',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = 'var(--bg-green)'}
                              onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                            >
                              ✎ 편집
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              style={{
                                width: '100%',
                                padding: '12px 16px',
                                background: 'var(--bg-card)',
                                border: 'none',
                                textAlign: 'left',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: 'var(--alert-red)',
                                fontWeight: '600',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.background = '#fee'}
                              onMouseLeave={(e) => e.target.style.background = 'var(--bg-card)'}
                            >
                              × 삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {course.holePars && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--primary-green)' }}>
                          홀별 PAR (남자 총: {(course.holePars.male || []).reduce((sum, par) => sum + (par || 0), 0)} / 여자 총: {(course.holePars.female || []).reduce((sum, par) => sum + (par || 0), 0)})
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(9, 1fr)', 
                          gap: '4px',
                          fontSize: '12px'
                        }}>
                          {(course.holePars.male || []).map((malePar, idx) => {
                            const femalePar = (course.holePars.female || [])[idx];
                            return (
                              <div 
                                key={idx}
                                style={{
                                  padding: '4px',
                                  background: 'var(--text-light)',
                                  borderRadius: '4px',
                                  textAlign: 'center',
                                  border: '1px solid var(--primary-green)'
                                }}
                              >
                                <div style={{ fontSize: '10px', color: 'var(--text-dark)', opacity: 0.7 }}>{idx + 1}</div>
                                <div style={{ fontWeight: '600' }}>
                                  <span style={{ color: 'var(--primary-green)' }}>{malePar}</span>
                                  <span style={{ color: 'var(--text-dark)' }}>/</span>
                                  <span style={{ color: '#e74c3c' }}>{femalePar}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'scoreManagement' && (
          <div>
            {(scoreManagementView === 'rounds' || scoreManagementView === 'memberScores' || scoreManagementView === 'allScores') && (
              <div style={{ margin: '12px 16px 16px', background: 'linear-gradient(135deg, #0047AB 0%, #1a56db 100%)', borderRadius: '16px', padding: '36px 24px', position: 'relative', overflow: 'hidden' }}>
                {/* 스코어카드 배경 패턴 */}
                <svg style={{ position: 'absolute', right: -12, top: '50%', transform: 'translateY(-50%)', opacity: 0.15, pointerEvents: 'none' }} width="160" height="130" viewBox="0 0 160 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* 스코어카드 본체 */}
                  <rect x="6" y="8" width="118" height="114" rx="10" stroke="white" strokeWidth="4.5" />
                  {/* 상단 헤더 구분선 */}
                  <line x1="6" y1="30" x2="124" y2="30" stroke="white" strokeWidth="3.5" />
                  {/* 세로 구분선 (홀 컬럼) */}
                  <line x1="34" y1="30" x2="34" y2="122" stroke="white" strokeWidth="2.5" />
                  <line x1="62" y1="30" x2="62" y2="122" stroke="white" strokeWidth="2.5" />
                  <line x1="90" y1="30" x2="90" y2="122" stroke="white" strokeWidth="2.5" />
                  {/* 가로 구분선 (행) */}
                  <line x1="6" y1="52" x2="124" y2="52" stroke="white" strokeWidth="2" />
                  <line x1="6" y1="74" x2="124" y2="74" stroke="white" strokeWidth="2" />
                  <line x1="6" y1="96" x2="124" y2="96" stroke="white" strokeWidth="2" />
                  {/* 헤더 텍스트 자리 (짧은 선) */}
                  <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  <line x1="40" y1="20" x2="56" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  <line x1="68" y1="20" x2="84" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  <line x1="96" y1="20" x2="118" y2="20" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  {/* 연필 */}
                  <rect x="132" y="30" width="18" height="68" rx="4" stroke="white" strokeWidth="4" transform="rotate(15 132 30)" />
                  <polygon points="140,98 148,98 144,112" stroke="white" strokeWidth="3" strokeLinejoin="round" fill="none" transform="rotate(15 144 98)" />
                </svg>
                <div style={{ position: 'relative', fontSize: '18px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>전체회원 스코어관리</div>
                <div style={{ position: 'relative', fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: '1.7' }}>각 라운딩별, 회원별 스코어를 입력하고 관리하세요.</div>
              </div>
            )}
            {(scoreManagementView === 'rounds' || scoreManagementView === 'memberScores' || scoreManagementView === 'allScores') && (
              <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '16px',
                padding: '0 16px'
              }}>
                <button
                  onClick={() => setScoreManagementView('rounds')}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    background: scoreManagementView === 'rounds' ? 'var(--primary-green)' : 'white',
                    color: scoreManagementView === 'rounds' ? 'white' : 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  라운딩별
                </button>
                <button
                  onClick={() => {
                    setScoreManagementView('memberScores');
                    setSelectedMemberForScore(null);
                    setMemberScoreBooking(null);
                    setMemberSearchText('');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    background: scoreManagementView === 'memberScores' ? 'var(--primary-green)' : 'white',
                    color: scoreManagementView === 'memberScores' ? 'white' : 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  회원별
                </button>
                <button
                  onClick={async () => {
                    setScoreManagementView('allScores');
                    try {
                      const res = await fetch('/api/scores/all');
                      const data = await res.json();
                      setAllScoresData(Array.isArray(data) ? data : []);
                    } catch (e) {
                      console.error('전체 스코어 로드 에러:', e);
                      setAllScoresData([]);
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    background: scoreManagementView === 'allScores' ? 'var(--primary-green)' : 'white',
                    color: scoreManagementView === 'allScores' ? 'white' : 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  전체
                </button>
              </div>
            )}

            {scoreManagementView === 'rounds' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 16px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    라운딩별 스코어
                  </h3>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-dark)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={showCompetitionRoundings}
                      onChange={(e) => setShowCompetitionRoundings(e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    클럽 컴페티션 포함
                  </label>
                </div>
                {bookings.filter(b => showCompetitionRoundings || !b.title?.startsWith('클럽 컴페티션')).length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏌️</div>
                    <div style={{ color: 'var(--text-dark)', opacity: 0.7 }}>등록된 라운딩이 없습니다</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {bookings.filter(b => showCompetitionRoundings || !b.title?.startsWith('클럽 컴페티션')).sort((a, b) => new Date(b.date) - new Date(a.date)).map(booking => (
                      <button
                        key={booking.id}
                        onClick={async () => {
                          setSelectedRoundForScore(booking);
                          setScoreManagementView('leaderboard');
                          setIsLoadingRoundScores(true);
                          setRoundScores([]);
                          try {
                            const dateStr = new Date(booking.date).toISOString().split('T')[0];
                            const res = await fetch(`/api/scores/booking/${encodeURIComponent(dateStr)}/${encodeURIComponent(booking.courseName)}`);
                            const data = await res.json();
                            setRoundScores(Array.isArray(data) ? data : []);
                          } catch (e) {
                            console.error('스코어 로드 에러:', e);
                            setRoundScores([]);
                          } finally {
                            setIsLoadingRoundScores(false);
                          }
                        }}
                        style={{
                          padding: '16px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'var(--bg-page)',
                          border: 'none',
                          borderBottom: '1px solid var(--border-color)'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-dark)' }}>
                            {booking.title}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                            {new Date(booking.date).toLocaleDateString('ko-KR')} · {booking.courseName || '미정'}
                          </div>
                        </div>
                        <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.5 }}>›</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {scoreManagementView === 'memberScores' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', padding: '0 16px' }}>
                  회원별 스코어 입력
                </h3>
                
                {!selectedMemberForScore ? (
                  <div style={{ padding: '0 16px' }}>
                    <input
                      type="text"
                      placeholder="회원 이름 또는 닉네임 검색..."
                      value={memberSearchText}
                      onChange={(e) => setMemberSearchText(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        fontSize: '14px',
                        marginBottom: '12px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {members
                        .filter(m => m.isActive)
                        .filter(m => {
                          if (!memberSearchText) return true;
                          const search = memberSearchText.toLowerCase();
                          return (m.name?.toLowerCase().includes(search) || m.nickname?.toLowerCase().includes(search));
                        })
                        .sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || '', 'ko'))
                        .map(member => (
                          <button
                            key={member.id}
                            onClick={() => setSelectedMemberForScore(member)}
                            style={{
                              padding: '14px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg-page)',
                              border: 'none',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                {member.nickname || member.name}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                {member.name !== member.nickname && member.name} · HCP {member.handicap || '-'}
                              </div>
                            </div>
                            <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.5 }}>›</div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : !memberScoreBooking ? (
                  <div>
                    <button
                      onClick={() => setSelectedMemberForScore(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px 16px',
                        fontSize: '14px',
                        color: 'var(--primary-green)',
                        cursor: 'pointer',
                        marginBottom: '8px'
                      }}
                    >
                      ‹ 회원 선택으로 돌아가기
                    </button>
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--bg-green)', 
                      marginBottom: '12px',
                      borderRadius: '8px',
                      marginLeft: '16px',
                      marginRight: '16px'
                    }}>
                      <span style={{ fontWeight: '600' }}>{selectedMemberForScore.nickname || selectedMemberForScore.name}</span>
                      <span style={{ color: 'var(--text-gray)', marginLeft: '8px' }}>님의 라운딩 선택</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                      {bookings
                        .filter(b => !b.title?.startsWith('클럽 컴페티션'))
                        .filter(b => {
                          // 선택된 회원이 참여한 라운딩만 표시
                          if (!b.participants) return false;
                          try {
                            const participants = typeof b.participants === 'string' ? JSON.parse(b.participants) : b.participants;
                            return participants.some(p => p.phone === selectedMemberForScore.phone);
                          } catch (e) {
                            return false;
                          }
                        })
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .map(booking => (
                          <button
                            key={booking.id}
                            onClick={async () => {
                              setMemberScoreBooking(booking);
                              setExistingMemberScore(null);
                              
                              try {
                                const dateStr = new Date(booking.date).toISOString().split('T')[0];
                                const res = await fetch(`/api/scores/member/${selectedMemberForScore.id}/${encodeURIComponent(booking.title)}`);
                                if (res.ok) {
                                  const existingScore = await res.json();
                                  if (existingScore && existingScore.id) {
                                    setExistingMemberScore(existingScore);
                                    let holesData = existingScore.holes || [];
                                    if (typeof holesData === 'string') {
                                      try { holesData = JSON.parse(holesData); } catch (e) { holesData = []; }
                                    }
                                    if (!Array.isArray(holesData)) holesData = Array(18).fill(0);
                                    const hasHoleData = holesData.some(h => h > 0);
                                    setMemberScoreData({
                                      totalScore: existingScore.totalScore || '',
                                      holes: holesData.length === 18 ? holesData : Array(18).fill(0),
                                      inputMode: hasHoleData ? 'holes' : 'total'
                                    });
                                  } else {
                                    setMemberScoreData({ totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
                                  }
                                } else {
                                  setMemberScoreData({ totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
                                }
                              } catch (e) {
                                console.error('기존 스코어 확인 에러:', e);
                                setMemberScoreData({ totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
                              }
                              
                              setScoreManagementView('memberScoreInput');
                            }}
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg-page)',
                              border: 'none',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px', color: 'var(--text-dark)' }}>
                                {booking.title}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                {new Date(booking.date).toLocaleDateString('ko-KR')} · {booking.courseName || '미정'}
                              </div>
                            </div>
                            <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.5 }}>›</div>
                          </button>
                        ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {scoreManagementView === 'memberScoreInput' && selectedMemberForScore && memberScoreBooking && (
              <div style={{ background: '#1a1a2e', minHeight: '100vh', margin: '-16px', padding: '16px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center', 
                  marginBottom: '16px'
                }}>
                  <button
                    onClick={() => {
                      setScoreManagementView('memberScores');
                      setMemberScoreBooking(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '8px 0',
                      color: 'white'
                    }}
                  >
                    ‹ Back
                  </button>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  padding: '16px',
                  borderRadius: '12px',
                  marginBottom: '16px',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                        {selectedMemberForScore.nickname || selectedMemberForScore.name}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '8px' }}>
                        HCP: {selectedMemberForScore.handicap || '-'}
                      </div>
                    </div>
                    <div style={{ position: 'relative' }}>
                      <button
                        onClick={() => setShowScoreMenu(!showScoreMenu)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'white',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '4px 8px',
                          lineHeight: 1
                        }}
                      >
                        ⋮
                      </button>
                      {showScoreMenu && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          overflow: 'hidden',
                          zIndex: 100,
                          minWidth: '100px'
                        }}>
                          <button
                            onClick={async () => {
                              setShowScoreMenu(false);
                              if (!existingMemberScore) {
                                alert('삭제할 스코어가 없습니다.');
                                return;
                              }
                              if (!confirm('이 스코어를 삭제하시겠습니까?')) return;
                              
                              setIsSavingMemberScore(true);
                              try {
                                const res = await fetch(`/api/scores/${existingMemberScore.id}`, {
                                  method: 'DELETE',
                                  headers: { 'X-Member-Id': user?.id }
                                });
                                
                                if (res.ok) {
                                  alert('스코어가 삭제되었습니다.');
                                  setScoreManagementView('memberScores');
                                  setMemberScoreBooking(null);
                                  setMemberScoreData({ totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
                                  setExistingMemberScore(null);
                                } else {
                                  alert('삭제에 실패했습니다.');
                                }
                              } catch (e) {
                                console.error('스코어 삭제 에러:', e);
                                alert('삭제에 실패했습니다.');
                              } finally {
                                setIsSavingMemberScore(false);
                              }
                            }}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              background: 'white',
                              border: 'none',
                              color: existingMemberScore ? '#dc3545' : '#ccc',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: existingMemberScore ? 'pointer' : 'not-allowed',
                              textAlign: 'left'
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ color: '#4a9d6a', fontSize: '14px', fontWeight: '600' }}>
                    {memberScoreBooking.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                    {new Date(memberScoreBooking.date).toLocaleDateString('ko-KR')} · {memberScoreBooking.courseName}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '16px' 
                  }}>
                    <button
                      onClick={() => setMemberScoreData(prev => ({ ...prev, inputMode: 'total' }))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: memberScoreData.inputMode === 'total' ? '#4a9d6a' : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      총타수 입력
                    </button>
                    <button
                      onClick={() => setMemberScoreData(prev => ({ ...prev, inputMode: 'holes' }))}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: memberScoreData.inputMode === 'holes' ? '#4a9d6a' : 'rgba(255,255,255,0.1)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      홀별 입력
                    </button>
                  </div>

                  {memberScoreData.inputMode === 'total' ? (
                    <div style={{ 
                      background: 'rgba(255,255,255,0.05)', 
                      padding: '20px', 
                      borderRadius: '12px',
                      textAlign: 'center'
                    }}>
                      <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', marginBottom: '12px', display: 'block' }}>
                        총타수
                      </label>
                      <input
                        type="number"
                        value={memberScoreData.totalScore}
                        onChange={(e) => setMemberScoreData(prev => ({ ...prev, totalScore: e.target.value }))}
                        placeholder="예: 85"
                        style={{
                          width: '120px',
                          padding: '16px',
                          fontSize: '28px',
                          fontWeight: '700',
                          textAlign: 'center',
                          borderRadius: '12px',
                          border: '2px solid rgba(255,255,255,0.2)',
                          background: 'rgba(255,255,255,0.1)',
                          color: 'white'
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const course = courses.find(c => c.name === memberScoreBooking.courseName);
                        const isFemale = selectedMemberForScore.gender === 'F' || selectedMemberForScore.gender === '여';
                        const parArr = course?.holePars?.[isFemale ? 'female' : 'male'] || Array(18).fill(4);

                        const renderHoleInputRow = (startHole, endHole, label) => {
                          const holesInRow = [];
                          for (let i = startHole; i <= endHole; i++) {
                            holesInRow.push(i);
                          }
                          const rowTotal = holesInRow.reduce((sum, h) => sum + (memberScoreData.holes[h - 1] || 0), 0);
                          const rowPar = holesInRow.reduce((sum, h) => sum + (parArr[h - 1] || 4), 0);

                          return (
                            <div key={label} style={{ marginBottom: '12px' }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center',
                                marginBottom: '8px',
                                padding: '0 4px'
                              }}>
                                <span style={{ color: 'white', fontWeight: '600' }}>{label}</span>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                                  PAR {rowPar} / 합계: {rowTotal}
                                </span>
                              </div>
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(9, 1fr)', 
                                gap: '4px' 
                              }}>
                                {holesInRow.map(holeNum => (
                                  <div key={holeNum} style={{ textAlign: 'center' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginBottom: '2px' }}>
                                      {holeNum}
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      max="15"
                                      value={memberScoreData.holes[holeNum - 1] || ''}
                                      onChange={(e) => {
                                        const newHoles = [...memberScoreData.holes];
                                        newHoles[holeNum - 1] = parseInt(e.target.value) || 0;
                                        setMemberScoreData(prev => ({ ...prev, holes: newHoles }));
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '8px 2px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        textAlign: 'center',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white'
                                      }}
                                    />
                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px', marginTop: '2px' }}>
                                      P{parArr[holeNum - 1] || 4}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        };

                        const totalHolesScore = memberScoreData.holes.reduce((a, b) => a + b, 0);

                        return (
                          <div style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            padding: '16px', 
                            borderRadius: '12px' 
                          }}>
                            {renderHoleInputRow(1, 9, 'OUT')}
                            {renderHoleInputRow(10, 18, 'IN')}
                            <div style={{ 
                              textAlign: 'center', 
                              padding: '12px', 
                              background: 'rgba(74, 157, 106, 0.3)',
                              borderRadius: '8px',
                              marginTop: '12px'
                            }}>
                              <span style={{ color: 'rgba(255,255,255,0.7)', marginRight: '8px' }}>총타수:</span>
                              <span style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>{totalHolesScore}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {existingMemberScore && (
                  <div style={{
                    background: 'rgba(52, 152, 219, 0.2)',
                    border: '1px solid rgba(52, 152, 219, 0.5)',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    marginBottom: '12px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#3498db', fontSize: '14px' }}>
                      기존 스코어가 있습니다. 수정 모드입니다.
                    </span>
                  </div>
                )}

                <button
                  onClick={async () => {
                    if (isSavingMemberScore) return;
                    
                    const holesSum = memberScoreData.holes.reduce((a, b) => a + b, 0);
                    const inputTotal = parseInt(memberScoreData.totalScore) || 0;
                    const originalTotal = existingMemberScore ? (parseInt(existingMemberScore.totalScore) || 0) : 0;
                    
                    let finalScore;
                    let finalHoles;
                    
                    if (memberScoreData.inputMode === 'total') {
                      if (inputTotal <= 0) {
                        alert('총타수를 입력해주세요.');
                        return;
                      }
                      finalScore = inputTotal;
                      finalHoles = Array(18).fill(0);
                    } else {
                      if (holesSum <= 0) {
                        alert('홀별 타수를 입력해주세요.');
                        return;
                      }
                      
                      if (existingMemberScore && originalTotal > 0 && originalTotal !== holesSum) {
                        const choice = window.confirm(
                          `기존 총타수(${originalTotal}타)와 새로 입력한 홀별 합계(${holesSum}타)가 다릅니다.\n\n` +
                          `[확인] → 새 스코어(${holesSum}타)로 저장\n` +
                          `[취소] → 저장하지 않고 수정화면으로 돌아가기`
                        );
                        
                        if (!choice) {
                          return;
                        }
                      }
                      
                      finalScore = holesSum;
                      finalHoles = memberScoreData.holes;
                    }

                    setIsSavingMemberScore(true);
                    try {
                      const course = courses.find(c => c.name === memberScoreBooking.courseName);
                      const isFemale = selectedMemberForScore.gender === 'F' || selectedMemberForScore.gender === '여';
                      const parArr = course?.holePars?.[isFemale ? 'female' : 'male'] || Array(18).fill(4);
                      const coursePar = parArr.reduce((a, b) => a + b, 0);

                      const scoreData = {
                        memberId: selectedMemberForScore.id,
                        roundingName: memberScoreBooking.title,
                        date: new Date(memberScoreBooking.date).toISOString().split('T')[0],
                        courseName: memberScoreBooking.courseName,
                        totalScore: finalScore,
                        holes: finalHoles,
                        coursePar: coursePar
                      };

                      let res;
                      if (existingMemberScore && existingMemberScore.id) {
                        res = await fetch(`/api/scores/${existingMemberScore.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', 'X-Member-Id': user?.id },
                          body: JSON.stringify(scoreData)
                        });
                      } else {
                        res = await fetch('/api/scores', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'X-Member-Id': user?.id },
                          body: JSON.stringify(scoreData)
                        });
                      }

                      if (res.ok) {
                        alert(existingMemberScore ? '스코어가 수정되었습니다.' : '스코어가 저장되었습니다.');
                        setScoreManagementView('memberScores');
                        setMemberScoreBooking(null);
                        setMemberScoreData({ totalScore: '', holes: Array(18).fill(0), inputMode: 'total' });
                        setExistingMemberScore(null);
                      } else {
                        const err = await res.json();
                        alert(err.error || '저장에 실패했습니다.');
                      }
                    } catch (e) {
                      console.error('스코어 저장 에러:', e);
                      alert('저장에 실패했습니다.');
                    } finally {
                      setIsSavingMemberScore(false);
                    }
                  }}
                  disabled={isSavingMemberScore}
                  style={{
                    width: '100%',
                    padding: '16px',
                    background: isSavingMemberScore ? '#666' : '#4a9d6a',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '16px',
                    fontWeight: '700',
                    cursor: isSavingMemberScore ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isSavingMemberScore ? '저장 중...' : '저장'}
                </button>
              </div>
            )}

            {scoreManagementView === 'allScores' && (
              <div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px', 
                  padding: '0 16px' 
                }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    전체 스코어 ({allScoresData.length}건)
                  </h3>
                </div>
                {allScoresData.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <div style={{ color: 'var(--text-dark)', opacity: 0.7 }}>등록된 스코어가 없습니다</div>
                  </div>
                ) : (
                  <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ background: 'var(--bg-green)', borderBottom: '2px solid var(--primary-green)' }}>
                            <th style={{ padding: '10px 8px', textAlign: 'center', width: '40px' }}>
                              <input
                                type="checkbox"
                                checked={selectedScoreIds.length === allScoresData.length && allScoresData.length > 0}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedScoreIds(allScoresData.map(s => s.id));
                                  } else {
                                    setSelectedScoreIds([]);
                                  }
                                }}
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                              />
                            </th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>날짜</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>회원</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>라운딩명</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>골프장</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>스코어</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allScoresData.map(score => (
                            <tr 
                              key={score.id} 
                              style={{ 
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: selectedScoreIds.includes(score.id) ? 'var(--bg-green)' : 'transparent'
                              }}
                            >
                              <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedScoreIds.includes(score.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedScoreIds(prev => [...prev, score.id]);
                                    } else {
                                      setSelectedScoreIds(prev => prev.filter(id => id !== score.id));
                                    }
                                  }}
                                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                              </td>
                              <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                                {score.date ? new Date(score.date).toLocaleDateString('ko-KR') : '-'}
                              </td>
                              <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
                                {score.user?.nickname || score.user?.name || '-'}
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                {score.roundingName || '-'}
                              </td>
                              <td style={{ padding: '10px 8px' }}>
                                {score.courseName || '-'}
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600' }}>
                                {score.totalScore || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {scoreManagementView === 'leaderboard' && selectedRoundForScore && (
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  padding: '16px 16px 0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setScoreManagementView('rounds');
                        setSelectedRoundForScore(null);
                        setRoundScores([]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '24px',
                        cursor: 'pointer',
                        padding: '0',
                        color: 'var(--primary-green)'
                      }}
                    >
                      ‹
                    </button>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                        {selectedRoundForScore.title}
                      </h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                        {new Date(selectedRoundForScore.date).toLocaleDateString('ko-KR')} · {(selectedRoundForScore.participants || []).length}명 참가
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/leaderboard?id=${selectedRoundForScore.id}`)}
                    style={{
                      background: '#d69e2e',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    Leaderboard
                  </button>
                </div>

                {isLoadingRoundScores ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      border: '4px solid var(--border-color)', 
                      borderTopColor: 'var(--primary-green)',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      margin: '0 auto 16px'
                    }} />
                    <div style={{ color: 'var(--text-dark)', opacity: 0.7 }}>스코어 로딩 중...</div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : (() => {
                  const rawParticipants = selectedRoundForScore.participants || [];
                  const participants = rawParticipants.map(p => {
                    try {
                      return typeof p === 'string' ? JSON.parse(p) : p;
                    } catch {
                      return p;
                    }
                  }).filter(p => p && typeof p === 'object');
                  
                  const allParticipants = participants.map(p => {
                    const existingScore = roundScores.find(s => 
                      (s.user?.phone === p.phone) || 
                      (s.userId && members.find(m => m.id === s.userId)?.phone === p.phone)
                    );
                    const memberInfo = members.find(m => m.phone === p.phone);
                    return {
                      ...p,
                      memberId: memberInfo?.id,
                      memberInfo,
                      score: existingScore,
                      hasScore: !!existingScore
                    };
                  });
                  
                  const withScores = allParticipants.filter(p => p.hasScore).sort((a, b) => {
                    const diffA = a.score.totalScore - (a.score.coursePar || 72);
                    const diffB = b.score.totalScore - (b.score.coursePar || 72);
                    return diffA - diffB;
                  });
                  const withoutScores = allParticipants.filter(p => !p.hasScore);
                  
                  return (
                    <>
                      {withScores.length > 0 && (
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: 'var(--primary-green)', background: 'var(--bg-green)' }}>
                            스코어 입력 완료 ({withScores.length}명)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {withScores.map((participant, index) => {
                              const score = participant.score;
                              const member = score.user || participant.memberInfo;
                              const diff = score.totalScore - (score.coursePar || 72);
                              const diffText = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : String(diff);
                              return (
                                <button
                                  key={score.id}
                                  onClick={() => {
                                    setSelectedPlayerForScore({ ...score, member, rank: index + 1 });
                                    setScoreManagementView('scorecard');
                                  }}
                                  style={{
                                    padding: '16px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    background: 'var(--bg-page)',
                                    border: 'none',
                                    borderBottom: '1px solid var(--border-color)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                      width: '32px',
                                      height: '32px',
                                      borderRadius: '50%',
                                      background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--primary-green)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontWeight: '700',
                                      fontSize: '14px'
                                    }}>
                                      {index + 1}
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                          {member?.nickname || member?.name || participant.nickname || participant.name}
                                        </span>
                                        {score.gameMode === 'foursome' && (
                                          <span style={{
                                            background: '#9333ea',
                                            color: 'white',
                                            padding: '1px 5px',
                                            borderRadius: '4px',
                                            fontSize: '10px',
                                            fontWeight: '600'
                                          }}>포썸</span>
                                        )}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                        HC: {member?.handicap || '-'}
                                        {score.gameMode === 'foursome' && score.gameMetadata && (() => {
                                          try {
                                            const meta = typeof score.gameMetadata === 'string' ? JSON.parse(score.gameMetadata) : score.gameMetadata;
                                            return ` · 파트너: ${meta.partner?.name || '?'}`;
                                          } catch { return ''; }
                                        })()}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                        {score.totalScore}
                                      </div>
                                      <div style={{ 
                                        fontSize: '13px', 
                                        fontWeight: '600',
                                        color: diff < 0 ? '#e74c3c' : diff > 0 ? '#3498db' : 'var(--text-dark)'
                                      }}>
                                        {diffText}
                                      </div>
                                    </div>
                                    <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.5 }}>›</div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {withoutScores.length > 0 && (
                        <div>
                          <div style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600', color: '#e67e22', background: '#fef5e7' }}>
                            스코어 미입력 ({withoutScores.length}명)
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {withoutScores.map((participant) => (
                              <div
                                key={participant.phone}
                                style={{
                                  padding: '16px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: 'var(--bg-page)',
                                  borderBottom: '1px solid var(--border-color)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: '#ccc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: '700',
                                    fontSize: '14px'
                                  }}>
                                    -
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                      {participant.nickname || participant.name}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                      HC: {participant.memberInfo?.handicap || '-'}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setEditingScore({ isNew: true, participant });
                                    setEditScoreData({
                                      totalScore: '',
                                      holes: Array(18).fill(0),
                                      inputMode: 'total'
                                    });
                                  }}
                                  style={{
                                    background: 'var(--primary-green)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '8px 16px',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                  }}
                                >
                                  스코어 입력
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {participants.length === 0 && (
                        <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                          <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                          <div style={{ color: 'var(--text-dark)', opacity: 0.7 }}>참가자가 없습니다</div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Legacy leaderboard for scores without participant matching - hidden */}
            {false && scoreManagementView === 'leaderboard_legacy' && selectedRoundForScore && (
              <div>
                {roundScores.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                    <div style={{ color: 'var(--text-dark)', opacity: 0.7 }}>등록된 스코어가 없습니다</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {roundScores
                      .sort((a, b) => {
                        const diffA = a.totalScore - (a.coursePar || 72);
                        const diffB = b.totalScore - (b.coursePar || 72);
                        return diffA - diffB;
                      })
                      .map((score, index) => {
                        const member = score.user || members.find(m => m.id === score.userId);
                        const diff = score.totalScore - (score.coursePar || 72);
                        const diffText = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : String(diff);
                        return (
                          <button
                            key={score.id}
                            onClick={() => {
                              setSelectedPlayerForScore({ ...score, member, rank: index + 1 });
                              setScoreManagementView('scorecard');
                            }}
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: 'var(--bg-page)',
                              border: 'none',
                              borderBottom: '1px solid var(--border-color)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : 'var(--primary-green)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: '700',
                                fontSize: '14px'
                              }}>
                                {index + 1}
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                    {member?.nickname || member?.name || '알 수 없음'}
                                  </span>
                                  {score.gameMode === 'foursome' && (
                                    <span style={{
                                      background: '#9333ea',
                                      color: 'white',
                                      padding: '1px 5px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: '600'
                                    }}>포썸</span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                  HC: {member?.handicap || '-'}
                                  {score.gameMode === 'foursome' && score.gameMetadata && (() => {
                                    try {
                                      const meta = typeof score.gameMetadata === 'string' ? JSON.parse(score.gameMetadata) : score.gameMetadata;
                                      return ` · 파트너: ${meta.partner?.name || '?'}`;
                                    } catch { return ''; }
                                  })()}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-dark)' }}>
                                  {score.totalScore}
                                </div>
                                <div style={{ 
                                  fontSize: '13px', 
                                  fontWeight: '600',
                                  color: diff < 0 ? '#e74c3c' : diff > 0 ? '#3498db' : 'var(--text-dark)'
                                }}>
                                  {diffText}
                                </div>
                              </div>
                              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.5 }}>›</div>
                            </div>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {scoreManagementView === 'scorecard' && selectedPlayerForScore && (
              <div style={{ background: '#001A3D', minHeight: '100vh', margin: '-16px', padding: '32px 16px 16px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px'
                }}>
                  <button
                    onClick={() => {
                      setScoreManagementView('leaderboard');
                      setSelectedPlayerForScore(null);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '8px 0',
                      color: 'white'
                    }}
                  >
                    ‹ Back
                  </button>
                  {['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setEditingScore(selectedPlayerForScore);
                          let holesData = selectedPlayerForScore.holes || [];
                          if (typeof holesData === 'string') {
                            try { holesData = JSON.parse(holesData); } catch (e) { holesData = []; }
                          }
                          if (!Array.isArray(holesData) || holesData.length === 0) {
                            holesData = Array(18).fill(0);
                          }
                          const hasHoleData = holesData.some(h => h > 0);
                          setEditScoreData({
                            totalScore: selectedPlayerForScore.totalScore,
                            holes: holesData,
                            inputMode: hasHoleData ? 'holes' : 'total'
                          });
                        }}
                        style={{
                          background: '#3498db',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={async () => {
                          if (!selectedPlayerForScore?.id) return;
                          if (!confirm('이 스코어를 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.')) return;
                          try {
                            const res = await fetch(`/api/scores/${selectedPlayerForScore.id}`, { method: 'DELETE', headers: { 'X-Member-Id': user?.id } });
                            if (!res.ok) {
                              alert('삭제에 실패했습니다.');
                              return;
                            }
                            setRoundScores(prev => prev.filter(s => s.id !== selectedPlayerForScore.id));
                            setScoreManagementView('leaderboard');
                            setSelectedPlayerForScore(null);
                            alert('스코어가 삭제되었습니다.');
                          } catch (e) {
                            console.error('스코어 삭제 실패:', e);
                            alert('삭제에 실패했습니다.');
                          }
                        }}
                        style={{
                          background: '#dc3545',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div>
                    <div style={{ color: 'white', fontSize: '18px', fontWeight: '700' }}>
                      {selectedPlayerForScore.member?.nickname || selectedPlayerForScore.member?.name || '알 수 없음'}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginTop: '4px'
                    }}>
                      <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'white'
                      }}>
                        HCP: {selectedPlayerForScore.member?.handicap || '-'}
                      </span>
                    </div>
                  </div>
                  {(() => {
                    const course = courses.find(c => c.name === selectedPlayerForScore.courseName);
                    const gender = selectedPlayerForScore.member?.gender;
                    const isFemale = gender === 'F' || gender === '여' || gender === 'female';
                    const parArr = course?.holePars?.[isFemale ? 'female' : 'male'] || Array(18).fill(4);
                    const totalPar = parArr.reduce((a, b) => a + b, 0);
                    const diff = selectedPlayerForScore.totalScore - totalPar;
                    const diffText = diff > 0 ? `+${diff}` : diff === 0 ? 'E' : String(diff);
                    return (
                      <div style={{
                        background: 'rgba(255,255,255,0.1)',
                        padding: '12px 20px',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px' }}>
                          <span style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>
                            {selectedPlayerForScore.totalScore}
                          </span>
                          <span style={{ color: '#60B0DF', fontSize: '14px', fontWeight: '600' }}>
                            {diffText}
                          </span>
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                          RANK {selectedPlayerForScore.rank}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {(() => {
                  let holes = selectedPlayerForScore.holes || [];
                  if (typeof holes === 'string') {
                    try { holes = JSON.parse(holes); } catch (e) { holes = []; }
                  }
                  const hasHoleData = Array.isArray(holes) && holes.some(h => h > 0);
                  const course = courses.find(c => c.name === selectedPlayerForScore.courseName);
                  const gender = selectedPlayerForScore.member?.gender;
                  const isFemale = gender === 'F' || gender === '여' || gender === 'female';
                  const parArr = course?.holePars?.[isFemale ? 'female' : 'male'] || Array(18).fill(4);

                  const getScoreColor = (score, par) => {
                    if (!score || score === 0) return 'transparent';
                    const diff = score - par;
                    if (diff <= -3) return '#133464'; // Ace/Albatross
                    if (diff === -2) return '#60B0DF'; // Eagle
                    if (diff === -1) return '#a7d6e5'; // Birdie
                    if (diff === 0) return 'transparent'; // Par (white)
                    if (diff === 1) return '#F19E38'; // Bogey
                    return '#BC411E'; // Double bogey+
                  };

                  const renderHoleRow = (startHole, endHole, label) => {
                    const holeNumbers = [];
                    const pars = [];
                    const scores = [];
                    const diffs = [];

                    for (let i = startHole; i <= endHole; i++) {
                      holeNumbers.push(i);
                      pars.push(parArr[i - 1] || 4);
                      scores.push(holes[i - 1] || 0);
                      diffs.push((holes[i - 1] || 0) - (parArr[i - 1] || 4));
                    }

                    const totalPar = pars.reduce((a, b) => a + b, 0);
                    const totalScore = scores.reduce((a, b) => a + b, 0);
                    const totalDiff = scores.filter(s => s > 0).length > 0 
                      ? scores.reduce((a, b, idx) => a + (b > 0 ? b - pars[idx] : 0), 0)
                      : 0;

                    return (
                      <div style={{ 
                        marginBottom: '12px',
                        background: 'white',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: `repeat(${endHole - startHole + 2}, 1fr)`,
                          fontSize: '13px'
                        }}>
                          {/* Hole numbers row - light colored background */}
                          {holeNumbers.map(h => (
                            <div key={`hole-${h}`} style={{ 
                              textAlign: 'center', 
                              padding: '10px 4px',
                              background: '#e8f5e9',
                              color: '#2d5f3f',
                              fontWeight: '600',
                              borderBottom: '1px solid #c8e6c9'
                            }}>
                              {h}
                            </div>
                          ))}
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '10px 4px', 
                            background: '#e8f5e9',
                            color: '#2d5f3f', 
                            fontWeight: '700',
                            borderBottom: '1px solid #c8e6c9'
                          }}>
                            {label}
                          </div>

                          {/* Par row */}
                          {pars.map((p, idx) => (
                            <div key={`par-${idx}`} style={{ 
                              textAlign: 'center', 
                              padding: '8px 4px',
                              color: '#666',
                              fontSize: '12px',
                              borderBottom: '1px solid #eee'
                            }}>
                              {p}
                            </div>
                          ))}
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '8px 4px', 
                            color: '#666', 
                            fontWeight: '600',
                            fontSize: '12px',
                            borderBottom: '1px solid #eee'
                          }}>
                            {totalPar}
                          </div>

                          {/* Score row */}
                          {scores.map((s, idx) => {
                            const bgColor = s > 0 ? getScoreColor(s, pars[idx]) : 'transparent';
                            const hasColor = bgColor !== 'transparent';
                            return (
                              <div key={`score-${idx}`} style={{ 
                                textAlign: 'center', 
                                padding: '8px 2px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '28px',
                                  height: '28px',
                                  background: bgColor,
                                  borderRadius: '4px',
                                  color: hasColor ? 'white' : '#333',
                                  fontWeight: '700',
                                  fontSize: '14px'
                                }}>
                                  {hasHoleData ? (s > 0 ? s : '-') : '-'}
                                </span>
                              </div>
                            );
                          })}
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '8px 2px', 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              background: '#f5f5f5',
                              borderRadius: '4px',
                              color: '#333', 
                              fontWeight: '700',
                              fontSize: '15px'
                            }}>
                              {hasHoleData ? totalScore : '-'}
                            </span>
                          </div>

                          {/* Diff row */}
                          {diffs.map((d, idx) => (
                            <div key={`diff-${idx}`} style={{ 
                              textAlign: 'center', 
                              padding: '6px 4px',
                              color: d < 0 ? '#e74c3c' : d > 0 ? '#3498db' : '#999',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {hasHoleData && scores[idx] > 0 ? (d > 0 ? `+${d}` : d) : ''}
                            </div>
                          ))}
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '6px 4px', 
                            color: totalDiff < 0 ? '#e74c3c' : totalDiff > 0 ? '#3498db' : '#999',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {hasHoleData && totalScore > 0 ? (totalDiff > 0 ? `+${totalDiff}` : totalDiff) : ''}
                          </div>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div style={{ padding: '16px 0' }}>
                      {renderHoleRow(1, 9, 'Out')}
                      {renderHoleRow(10, 18, 'In')}

                      {/* Legend */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '20px',
                        padding: '16px'
                      }}>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#133464',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Ace/Albatross</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#60B0DF',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Eagle</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#a7d6e5',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: '#333', fontSize: '11px', fontWeight: '600' }}>Birdie</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#f5f5f5',
                          borderRadius: '4px',
                          border: '1px solid #ddd'
                        }}>
                          <span style={{ color: '#333', fontSize: '11px', fontWeight: '600' }}>Par</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#F19E38',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Bogey</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#BC411E',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>D. Bogey +</span>
                        </div>
                      </div>

                      {!hasHoleData && (
                        <div style={{
                          textAlign: 'center',
                          padding: '20px',
                          color: 'rgba(255,255,255,0.5)',
                          fontSize: '14px'
                        }}>
                          홀별 타수 정보가 없습니다 (총 타수만 입력됨)
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Score Edit/Create Modal - accessible from both leaderboard and scorecard views */}
            {editingScore && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '20px'
              }}>
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  width: '100%',
                  maxWidth: '400px',
                  maxHeight: '80vh',
                  overflow: 'auto'
                }}>
                  <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                    {editingScore.isNew ? '스코어 입력' : '스코어 수정'}
                  </h3>
                  {editingScore.isNew && editingScore.participant && (
                    <div style={{ 
                      marginBottom: '16px', 
                      padding: '12px', 
                      background: 'var(--bg-green)', 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'var(--primary-green)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: '700'
                      }}>
                        {(editingScore.participant.nickname || editingScore.participant.name || '?')[0]}
                      </div>
                      <div>
                        <div style={{ fontWeight: '600' }}>{editingScore.participant.nickname || editingScore.participant.name}</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>HC: {editingScore.participant.memberInfo?.handicap || '-'}</div>
                      </div>
                    </div>
                  )}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                      <label style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 12px',
                        border: editScoreData?.inputMode === 'total' ? '2px solid var(--primary-green)' : '1px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: editScoreData?.inputMode === 'total' ? 'var(--bg-green)' : 'white'
                      }}>
                        <input
                          type="radio"
                          name="scoreInputMode"
                          checked={editScoreData?.inputMode === 'total'}
                          onChange={() => setEditScoreData(prev => ({ 
                            ...prev, 
                            inputMode: 'total',
                            holes: Array(18).fill(0)
                          }))}
                          style={{ accentColor: 'var(--primary-green)' }}
                        />
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>총타수 입력</span>
                      </label>
                      <label style={{ 
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 12px',
                        border: editScoreData?.inputMode === 'holes' ? '2px solid var(--primary-green)' : '1px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: editScoreData?.inputMode === 'holes' ? 'var(--bg-green)' : 'white'
                      }}>
                        <input
                          type="radio"
                          name="scoreInputMode"
                          checked={editScoreData?.inputMode === 'holes'}
                          onChange={() => setEditScoreData(prev => ({ 
                            ...prev, 
                            inputMode: 'holes',
                            totalScore: (prev?.holes || []).reduce((a, b) => a + (b || 0), 0)
                          }))}
                          style={{ accentColor: 'var(--primary-green)' }}
                        />
                        <span style={{ fontWeight: '600', fontSize: '14px' }}>홀별타수 입력</span>
                      </label>
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: editScoreData?.inputMode === 'holes' ? '#999' : 'inherit' }}>
                      총 타수 <span style={{ color: '#e74c3c' }}>*</span>
                      {editScoreData?.inputMode === 'holes' && (
                        <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '8px', color: 'var(--primary-green)' }}>
                          (홀별 합계 자동 계산)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      value={editScoreData?.totalScore || ''}
                      onChange={(e) => setEditScoreData(prev => ({ ...prev, totalScore: parseInt(e.target.value) || 0 }))}
                      placeholder="예: 85"
                      disabled={editScoreData?.inputMode === 'holes'}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '16px',
                        background: editScoreData?.inputMode === 'holes' ? '#f5f5f5' : 'white',
                        color: editScoreData?.inputMode === 'holes' ? '#666' : 'inherit'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: editScoreData?.inputMode === 'total' ? '#999' : 'inherit' }}>
                      홀별 타수
                      {editScoreData?.inputMode === 'total' && (
                        <span style={{ fontSize: '12px', fontWeight: '400', marginLeft: '8px', color: '#999' }}>
                          (비활성화)
                        </span>
                      )}
                    </label>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(6, 1fr)', 
                      gap: '8px',
                      opacity: editScoreData?.inputMode === 'total' ? 0.5 : 1,
                      pointerEvents: editScoreData?.inputMode === 'total' ? 'none' : 'auto'
                    }}>
                      {(editScoreData?.holes || []).map((h, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{idx + 1}</div>
                          <input
                            type="number"
                            value={h || ''}
                            onChange={(e) => {
                              const newHoles = [...(editScoreData?.holes || [])];
                              newHoles[idx] = parseInt(e.target.value) || 0;
                              const newTotal = newHoles.reduce((a, b) => a + (b || 0), 0);
                              setEditScoreData(prev => ({ ...prev, holes: newHoles, totalScore: newTotal }));
                            }}
                            disabled={editScoreData?.inputMode === 'total'}
                            style={{
                              width: '100%',
                              padding: '8px 4px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              textAlign: 'center',
                              background: editScoreData?.inputMode === 'total' ? '#f5f5f5' : 'white'
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setEditingScore(null);
                        setEditScoreData(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        background: 'white',
                        fontSize: '16px',
                        cursor: 'pointer'
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={async () => {
                        if (!editScoreData?.totalScore || editScoreData.totalScore < 1) {
                          alert('총 타수를 입력해주세요');
                          return;
                        }
                        try {
                          if (editingScore.isNew) {
                            const participant = editingScore.participant;
                            const memberId = participant.memberId || participant.memberInfo?.id;
                            if (!memberId) {
                              alert('회원 정보를 찾을 수 없습니다');
                              return;
                            }
                            const dateStr = new Date(selectedRoundForScore.date).toISOString().split('T')[0];
                            const course = courses.find(c => c.name === selectedRoundForScore.courseName);
                            const coursePar = course?.holePars?.male?.reduce((a, b) => a + b, 0) || 72;
                            
                            const res = await fetch('/api/scores', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'X-Member-Id': user?.id },
                              body: JSON.stringify({
                                memberId: memberId,
                                markerId: memberId,
                                roundingName: selectedRoundForScore.title,
                                date: dateStr,
                                courseName: selectedRoundForScore.courseName,
                                totalScore: editScoreData.totalScore,
                                coursePar: coursePar,
                                holes: editScoreData.holes.map(h => h || 0)
                              })
                            });
                            if (res.ok) {
                              const newScore = await res.json();
                              setRoundScores(prev => [...prev, newScore]);
                              setEditingScore(null);
                              setEditScoreData(null);
                            } else {
                              const err = await res.json();
                              alert(err.error || '저장에 실패했습니다');
                            }
                          } else {
                            const res = await fetch(`/api/scores/${editingScore.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'X-Member-Id': user?.id },
                              body: JSON.stringify({
                                totalScore: editScoreData.totalScore,
                                holes: editScoreData.holes
                              })
                            });
                            if (res.ok) {
                              const updated = await res.json();
                              setRoundScores(prev => prev.map(s => s.id === updated.id ? updated : s));
                              if (selectedPlayerForScore) {
                                setSelectedPlayerForScore(prev => ({ ...prev, ...updated }));
                              }
                              setEditingScore(null);
                              setEditScoreData(null);
                            }
                          }
                        } catch (e) {
                          console.error('저장 에러:', e);
                          alert('저장에 실패했습니다');
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: 'none',
                        borderRadius: '8px',
                        background: 'var(--primary-green)',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                앱 설정
              </h3>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--bg-green)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                    회원가입 승인 필요
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.7 }}>
                    새 회원 가입 시 운영진의 승인이 필요합니다
                  </div>
                </div>
                <div
                  onClick={handleApprovalToggle}
                  style={{
                    width: '60px',
                    height: '32px',
                    background: approvalRequired ? 'var(--primary-green)' : '#ccc',
                    borderRadius: '16px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: approvalRequired ? '30px' : '2px',
                    transition: 'left 0.3s'
                  }} />
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: 'var(--bg-green)',
                borderRadius: '8px',
                marginTop: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                    우승자 맞추기 기능
                  </div>
                  <div style={{ fontSize: '13px', opacity: 0.7 }}>
                    라운딩 우승자 예측 게임을 활성화합니다
                  </div>
                </div>
                <div
                  onClick={handlePickWinnerToggle}
                  style={{
                    width: '60px',
                    height: '32px',
                    background: pickWinnerEnabled ? 'var(--primary-green)' : '#ccc',
                    borderRadius: '16px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background 0.3s'
                  }}
                >
                  <div style={{
                    width: '28px',
                    height: '28px',
                    background: 'white',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: pickWinnerEnabled ? '30px' : '2px',
                    transition: 'left 0.3s'
                  }} />
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                4인 조편성 규칙 적용
              </h3>
              <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748B)', marginBottom: '16px', lineHeight: 1.5 }}>
                활성화된 라운딩 유형에서 5명 이상일 경우 조편성을 완료해야 플레이를 시작할 수 있습니다
              </div>
              {[
                { type: '정기모임', label: '정기라운딩' },
                { type: '컴페티션', label: '컴페티션' },
                { type: '캐주얼', label: '캐주얼' },
              ].map(({ type, label }) => (
                <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--bg-green)', borderRadius: '8px', marginBottom: '8px' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '12px', opacity: 0.65 }}>
                      {squadFormationRules[type] ? '5명 이상 시 조편성 필수' : '조편성 없이 바로 플레이'}
                    </div>
                  </div>
                  <div
                    onClick={() => handleSquadRuleToggle(type)}
                    style={{ width: '60px', height: '32px', background: squadFormationRules[type] ? 'var(--primary-green)' : '#ccc', borderRadius: '16px', position: 'relative', cursor: 'pointer', transition: 'background 0.3s', flexShrink: 0 }}
                  >
                    <div style={{ width: '28px', height: '28px', background: 'white', borderRadius: '50%', position: 'absolute', top: '2px', left: squadFormationRules[type] ? '30px' : '2px', transition: 'left 0.3s' }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                클럽회계관리 권한
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 참가비 메뉴에서 참가비 내역을 확인하고 관리할 수 있는 권한을 부여합니다
              </div>
              <div style={{ display: 'grid', gap: '8px' }}>
                {members.filter(m => m.isActive && ['관리자', '방장', '운영진', '클럽운영진'].includes(m.role)).map(member => (
                  <div
                    key={member.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-green)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {member.photo ? (
                        <img 
                          src={member.photo} 
                          alt={member.name}
                          style={{
                            width: '40px',
                            height: '40px',
                            objectFit: 'cover',
                            borderRadius: '50%',
                            border: '2px solid var(--border-color)'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--primary-green)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px',
                          fontWeight: '700',
                          color: 'var(--text-light)'
                        }}>
                          {member.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '2px' }}>
                          {member.name}
                          {member.role && member.role !== '회원' && (
                            <span style={{ 
                              marginLeft: '8px',
                              fontSize: '12px',
                              padding: '2px 8px',
                              background: 'var(--primary-green)',
                              color: 'var(--text-light)',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              {member.role}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '13px', opacity: 0.7 }}>
                          {member.nickname || '-'}
                        </div>
                      </div>
                    </div>
                    <div
                      onClick={async () => {
                        try {
                          await apiService.toggleFeesPermission(member.id);
                          await loadMembers();
                        } catch (error) {
                          console.error('회비관리 권한 변경 실패:', error);
                          alert('권한 변경에 실패했습니다.');
                        }
                      }}
                      style={{
                        width: '60px',
                        height: '32px',
                        background: member.canManageFees ? 'var(--primary-green)' : '#ccc',
                        borderRadius: '16px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background 0.3s'
                      }}
                    >
                      <div style={{
                        width: '28px',
                        height: '28px',
                        background: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: member.canManageFees ? '30px' : '2px',
                        transition: 'left 0.3s'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>입금항목 관리</h3>
              {/* 기존 항목 목록 */}
              {incomeCategories.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#9CA3AF', fontSize: '13px', marginBottom: '10px' }}>등록된 입금항목이 없습니다</div>
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  {incomeCategories.map((category, i) => (
                    <div key={category.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: i < incomeCategories.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}>
                      <span style={{ fontSize: '14px', color: '#1e293b' }}>{category.name}</span>
                      <button onClick={() => handleDeleteIncomeCategory(category.id)}
                        style={{ padding: '3px 10px', background: 'none', color: '#DC2626', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
              {/* 새 항목 추가 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={newIncomeCategoryName} onChange={(e) => setNewIncomeCategoryName(e.target.value)} placeholder="새 입금항목명 입력..." style={{ flex: 1, padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }} />
                <button onClick={handleAddIncomeCategory} style={{ padding: '10px 16px', background: '#0047AB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 추가</button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '10px' }}>출금항목 관리</h3>
              {/* 기존 항목 목록 */}
              {expenseCategories.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#9CA3AF', fontSize: '13px', marginBottom: '10px' }}>등록된 출금항목이 없습니다</div>
              ) : (
                <div style={{ marginBottom: '10px' }}>
                  {expenseCategories.map((category, i) => (
                    <div key={category.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '7px 0',
                      borderBottom: i < expenseCategories.length - 1 ? '1px solid #F1F5F9' : 'none',
                    }}>
                      <span style={{ fontSize: '14px', color: '#1e293b' }}>{category.name}</span>
                      <button onClick={() => handleDeleteExpenseCategory(category.id)}
                        style={{ padding: '3px 10px', background: 'none', color: '#DC2626', border: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}>삭제</button>
                    </div>
                  ))}
                </div>
              )}
              {/* 새 항목 추가 */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" value={newExpenseCategoryName} onChange={(e) => setNewExpenseCategoryName(e.target.value)} placeholder="새 출금항목명 입력..." style={{ flex: 1, padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '14px' }} />
                <button onClick={handleAddExpenseCategory} style={{ padding: '10px 16px', background: '#0047AB', color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 추가</button>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                모임 소개문구
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • About 페이지에 표시될 모임 소개문구를 작성합니다
              </div>
              <textarea
                value={clubIntroText}
                onChange={(e) => setClubIntroText(e.target.value)}
                placeholder="모임 소개문구를 입력해주세요..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={async () => {
                  try {
                    await apiService.updateSetting('clubIntroText', { value: clubIntroText });
                    setSavedClubIntroText(clubIntroText);
                    alert('모임 소개문구가 저장되었습니다.');
                  } catch (error) {
                    console.error('모임 소개문구 저장 실패:', error);
                    alert('저장에 실패했습니다.');
                  }
                }}
                disabled={clubIntroText === savedClubIntroText}
                style={{
                  padding: '12px 24px',
                  background: clubIntroText !== savedClubIntroText ? 'var(--primary-green)' : '#ccc',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: clubIntroText !== savedClubIntroText ? 'pointer' : 'not-allowed'
                }}
              >
                {clubIntroText !== savedClubIntroText ? '저장하기' : '저장됨'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                모임 회칙
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • About 페이지에서 "회칙보기" 버튼을 통해 표시될 모임 회칙을 작성합니다
              </div>
              <textarea
                value={clubRulesText}
                onChange={(e) => setClubRulesText(e.target.value)}
                placeholder="모임 회칙을 입력해주세요..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={async () => {
                  try {
                    await apiService.updateSetting('clubRulesText', { value: clubRulesText });
                    setSavedClubRulesText(clubRulesText);
                    alert('모임 회칙이 저장되었습니다.');
                  } catch (error) {
                    console.error('모임 회칙 저장 실패:', error);
                    alert('저장에 실패했습니다.');
                  }
                }}
                disabled={clubRulesText === savedClubRulesText}
                style={{
                  padding: '12px 24px',
                  background: clubRulesText !== savedClubRulesText ? 'var(--primary-green)' : '#ccc',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: clubRulesText !== savedClubRulesText ? 'pointer' : 'not-allowed'
                }}
              >
                {clubRulesText !== savedClubRulesText ? '저장하기' : '저장됨'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                개인 회비 납부안내 문구
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 참가비 - 개인참가비 내역 탭에 표시될 납부안내 문구를 작성합니다
              </div>
              <textarea
                value={paymentGuideText}
                onChange={(e) => setPaymentGuideText(e.target.value)}
                placeholder="납부안내 문구를 입력해주세요..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={async () => {
                  try {
                    await apiService.updateSetting('paymentGuideText', { value: paymentGuideText });
                    setSavedPaymentGuideText(paymentGuideText);
                    alert('납부안내 문구가 저장되었습니다.');
                  } catch (error) {
                    console.error('납부안내 문구 저장 실패:', error);
                    alert('저장에 실패했습니다.');
                  }
                }}
                disabled={paymentGuideText === savedPaymentGuideText}
                style={{
                  padding: '12px 24px',
                  background: paymentGuideText !== savedPaymentGuideText ? 'var(--primary-green)' : '#ccc',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: paymentGuideText !== savedPaymentGuideText ? 'pointer' : 'not-allowed'
                }}
              >
                {paymentGuideText !== savedPaymentGuideText ? '저장하기' : '저장됨'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                카카오톡 오픈채팅방 링크
              </h3>
              <div style={{ padding: '10px 12px', background: 'var(--bg-green)', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                • 회원가입 완료 화면에 표시될 카카오톡 오픈채팅방 링크를 입력합니다
              </div>
              <input
                type="url"
                value={kakaoOpenChatUrl}
                onChange={e => setKakaoOpenChatUrl(e.target.value)}
                placeholder="https://open.kakao.com/o/..."
                style={{ width: '100%', padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              <button
                onClick={async () => {
                  try {
                    await apiService.updateSetting('kakaoOpenChatUrl', { value: kakaoOpenChatUrl });
                    setSavedKakaoOpenChatUrl(kakaoOpenChatUrl);
                    alert('링크가 저장되었습니다.');
                  } catch {
                    alert('저장에 실패했습니다.');
                  }
                }}
                disabled={kakaoOpenChatUrl === savedKakaoOpenChatUrl}
                style={{ padding: '12px 24px', background: kakaoOpenChatUrl !== savedKakaoOpenChatUrl ? 'var(--primary-green)' : '#ccc', color: 'var(--text-light)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: kakaoOpenChatUrl !== savedKakaoOpenChatUrl ? 'pointer' : 'not-allowed' }}
              >
                {kakaoOpenChatUrl !== savedKakaoOpenChatUrl ? '저장하기' : '저장됨'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                회원가입 페이지
              </h3>
              <div style={{ padding: '10px 12px', background: 'var(--bg-green)', borderRadius: '6px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                • 아래 링크를 복사해서 공유하면 누구나 회원가입 신청을 할 수 있습니다
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0', marginBottom: 12 }}>
                <span style={{ flex: 1, fontSize: 13, color: '#475569', wordBreak: 'break-all' }}>{window.location.origin}/join</span>
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin + '/join');
                  alert('링크가 복사되었습니다!');
                }}
                style={{ padding: '12px 24px', background: 'var(--primary-green)', color: 'var(--text-light)', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}
              >
                링크 복사하기
              </button>
            </div>

            <div className="card" style={{ background: 'var(--bg-green)', border: 'none' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7, textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>3355 골프 클럽</div>
                <div>버전 1.0.0</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'developer' && (
          <div>
            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  기능별 권한 설정
                </h3>
                <button
                  onClick={handleSavePermissions}
                  disabled={!hasChanges}
                  style={{
                    padding: '10px 20px',
                    background: hasChanges ? 'var(--primary-green)' : '#ccc',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: hasChanges ? 'pointer' : 'not-allowed'
                  }}
                >
                  {hasChanges ? '✓ 저장하기' : '✓ 저장됨'}
                </button>
              </div>

              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 각 기능의 최소 권한을 설정하세요<br/>
                • 클럽운영진은 자신의 클럽 컴페티션만 관리할 수 있습니다
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '140px repeat(5, 1fr)',
                gap: '8px',
                padding: '8px 12px',
                background: 'var(--bg-card)',
                borderRadius: '6px',
                marginBottom: '8px',
                fontSize: '11px',
                fontWeight: '600',
                color: 'var(--primary-green)',
                borderBottom: '2px solid var(--primary-green)'
              }}>
                <div style={{ textAlign: 'left' }}>기능</div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <CrownIcon role="관리자" size={14} />
                  <span>관리자</span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <CrownIcon role="방장" size={14} />
                  <span>방장</span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <CrownIcon role="운영진" size={14} />
                  <span>운영진</span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <CrownIcon role="클럽운영진" size={14} />
                  <span>클럽운영진</span>
                </div>
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <div style={{ height: '14px' }}></div>
                  <span>회원</span>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {features.map(feature => {
                  const roles = ['관리자', '방장', '운영진', '클럽운영진', '회원'];
                  const selectedRole = permissions[feature.id] || '관리자';
                  const selectedIndex = roles.indexOf(selectedRole);
                  
                  return (
                    <div
                      key={feature.id}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '140px repeat(5, 1fr)',
                        gap: '8px',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'var(--bg-card)',
                        borderBottom: '1px solid var(--border-color)',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--primary-green)'
                      }}>
                        {feature.name}
                      </div>
                      
                      {roles.map((role, index) => {
                        const isActive = index <= selectedIndex;
                        
                        return (
                          <div
                            key={role}
                            onClick={() => handlePermissionChange(feature.id, role)}
                            style={{
                              height: '18px',
                              background: isActive ? 'var(--primary-green)' : '#f0f0f0',
                              borderRadius: '3px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              border: '1px solid var(--border-color)'
                            }}
                            title={`${role}로 설정`}
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                앱 소개문구
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • About 페이지에서 "앱 소개" 섹션에 표시될 문구를 작성합니다<br/>
                • 타이틀 작성: <strong>##타이틀##</strong> 형식으로 작성하면 크고 두껍게 표시됩니다
              </div>
              <textarea
                value={appDescriptionText}
                onChange={(e) => setAppDescriptionText(e.target.value)}
                placeholder="앱 소개문구를 입력해주세요..."
                style={{
                  width: '100%',
                  minHeight: '200px',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  marginBottom: '12px',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={async () => {
                  try {
                    await apiService.updateSetting('appDescriptionText', { value: appDescriptionText });
                    setSavedAppDescriptionText(appDescriptionText);
                    alert('앱 소개문구가 저장되었습니다.');
                  } catch (error) {
                    console.error('앱 소개문구 저장 실패:', error);
                    alert('저장에 실패했습니다.');
                  }
                }}
                disabled={appDescriptionText === savedAppDescriptionText}
                style={{
                  padding: '12px 24px',
                  background: appDescriptionText !== savedAppDescriptionText ? 'var(--primary-green)' : '#ccc',
                  color: 'var(--text-light)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: appDescriptionText !== savedAppDescriptionText ? 'pointer' : 'not-allowed'
                }}
              >
                {appDescriptionText !== savedAppDescriptionText ? '저장하기' : '저장됨'}
              </button>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                클럽 로고
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 업로드한 로고가 로그인 화면, 로딩 화면, About 페이지에 표시됩니다<br/>
                • 권장 크기: 200x200 픽셀 이상의 정사각형 이미지
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                {clubLogo && (
                  <div style={{ 
                    width: '80px', 
                    height: '80px', 
                    borderRadius: '50%', 
                    overflow: 'hidden',
                    border: '2px solid var(--primary-green)',
                    flexShrink: 0
                  }}>
                    <img 
                      src={clubLogo} 
                      alt="현재 로고" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover' 
                      }} 
                    />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          const img = new Image();
                          img.onload = async () => {
                            const canvas = document.createElement('canvas');
                            const MAX_SIZE = 300;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                              if (width > MAX_SIZE) {
                                height *= MAX_SIZE / width;
                                width = MAX_SIZE;
                              }
                            } else {
                              if (height > MAX_SIZE) {
                                width *= MAX_SIZE / height;
                                height = MAX_SIZE;
                              }
                            }

                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, width, height);
                            
                            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            const success = await updateClubLogo(compressedDataUrl);
                            if (success) {
                              alert('로고가 저장되었습니다.');
                            } else {
                              alert('로고 저장에 실패했습니다.');
                            }
                          };
                          img.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ 
                      width: '100%',
                      padding: '10px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
              
              {clubLogo && (
                <button
                  onClick={async () => {
                    if (confirm('로고를 삭제하시겠습니까? 기본 로고로 복원됩니다.')) {
                      const success = await updateClubLogo(null);
                      if (success) {
                        alert('로고가 삭제되었습니다.');
                      } else {
                        alert('로고 삭제에 실패했습니다.');
                      }
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--bg-card)',
                    color: 'var(--alert-red)',
                    border: '1px solid var(--alert-red)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  로고 삭제
                </button>
              )}
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  사용자 활동 로그
                </h3>
                <button
                  onClick={loadActivityLogs}
                  disabled={isLoadingActivityLogs}
                  style={{
                    padding: '8px 16px',
                    background: 'var(--primary-green)',
                    color: 'var(--text-light)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: isLoadingActivityLogs ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isLoadingActivityLogs ? '로딩...' : '새로고침'}
                </button>
              </div>

              <div style={{
                padding: '12px',
                background: 'var(--bg-green)',
                borderRadius: '8px',
                marginBottom: '16px'
              }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ 
                    width: '10px', 
                    height: '10px', 
                    background: '#22c55e', 
                    borderRadius: '50%',
                    display: 'inline-block'
                  }}></span>
                  현재 접속중 ({onlineMembers.length}명)
                </div>
                {onlineMembers.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {onlineMembers.map(member => (
                      <div
                        key={member.id}
                        style={{
                          padding: '4px 10px',
                          background: 'var(--bg-card)',
                          borderRadius: '16px',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          background: '#22c55e', 
                          borderRadius: '50%' 
                        }}></span>
                        {member.nickname || member.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.6 }}>
                    현재 접속중인 회원이 없습니다
                  </div>
                )}
              </div>

              <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                최근 활동 내역
              </div>
              
              {isLoadingActivityLogs ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dark)', opacity: 0.6 }}>
                  로딩 중...
                </div>
              ) : activityLogs.length > 0 ? (
                <div style={{ 
                  maxHeight: '400px', 
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-green)' }}>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>시간</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>회원</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600' }}>페이지</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600' }}>기기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activityLogs.map(log => (
                        <tr 
                          key={log.id} 
                          style={{ borderBottom: '1px solid var(--border-color)' }}
                        >
                          <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                            {formatTimeAgo(log.createdAt)}
                          </td>
                          <td style={{ padding: '8px' }}>
                            {log.memberName}
                          </td>
                          <td style={{ padding: '8px', color: 'var(--primary-green)' }}>
                            {log.path}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              background: getDeviceType(log.userAgent) === 'Mobile' ? '#dbeafe' : '#f3e8ff',
                              color: getDeviceType(log.userAgent) === 'Mobile' ? '#1d4ed8' : '#7c3aed'
                            }}>
                              {getDeviceType(log.userAgent)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-dark)', opacity: 0.6 }}>
                  활동 로그가 없습니다
                </div>
              )}
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>메뉴 표시 설정</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>거래 내역 메뉴 표시</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dark)', opacity: 0.6, marginTop: 2 }}>관리 메뉴에서 거래 내역 항목을 표시합니다</div>
                </div>
                <div
                  onClick={() => {
                    const next = !showLedger;
                    setShowLedger(next);
                    localStorage.setItem('devShowLedger', String(next));
                  }}
                  style={{
                    width: 48, height: 28, borderRadius: 14,
                    background: showLedger ? '#0047AB' : '#ccc',
                    position: 'relative', cursor: 'pointer', flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: showLedger ? 23 : 3,
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700', color: 'var(--alert-red)' }}>
                위험 구역
              </h3>
              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--bg-card)',
                  color: 'var(--alert-red)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '8px'
                }}
                onClick={() => {
                  if (confirm('정말로 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                    alert('데이터 초기화 기능은 준비 중입니다.');
                  }
                }}
              >
                × 모든 데이터 초기화
              </button>
            </div>
          </div>
        )}
      </div>

      {showScoreModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--bg-card)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px' 
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>
                스코어 기록
              </h3>
              <button
                onClick={handleCloseScoreModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-dark)', opacity: 0.7
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontSize: '15px',
                fontWeight: '700',
                color: 'var(--primary-green)',
                marginBottom: '12px',
                padding: '12px',
                background: 'var(--bg-green)',
                borderRadius: '6px'
              }}>
                {members.find(m => m.id === showScoreModal)?.nickname || 
                 members.find(m => m.id === showScoreModal)?.name}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  라운딩 이름 (선택)
                </label>
                <input
                  type="text"
                  placeholder="예: 1월 정기 라운딩"
                  value={scoreFormData.roundingName}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, roundingName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  날짜 *
                </label>
                <input
                  type="date"
                  value={scoreFormData.date}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  골프장 *
                </label>
                <SearchableDropdown
                  options={courses}
                  value={scoreFormData.courseName}
                  onChange={(value) => setScoreFormData({ ...scoreFormData, courseName: value })}
                  placeholder="골프장 선택 (검색 가능)"
                  displayKey="name"
                  valueKey="name"
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--primary-green)',
                  marginBottom: '8px'
                }}>
                  총 타수 *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="예: 85"
                  value={scoreFormData.totalScore}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, totalScore: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '8px', marginBottom: '24px' }}>
              <button
                onClick={handleCloseScoreModal}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: '#BD5B43',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소하기
              </button>
              <button
                onClick={handleSaveScore}
                style={{
                  flex: 1,
                  padding: '14px 24px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                저장
              </button>
            </div>

            {memberScores.length > 0 && (
              <div style={{
                borderTop: '2px solid #e0e0e0',
                paddingTop: '20px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: 'var(--primary-green)',
                  marginBottom: '16px'
                }}>
                  📊 입력된 스코어 ({memberScores.length}개)
                </h4>
                <div style={{ display: 'grid', gap: '12px', maxHeight: '300px', overflow: 'auto' }}>
                  {memberScores.sort((a, b) => new Date(b.date) - new Date(a.date)).map((score, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-green)',
                        borderRadius: '8px',
                        border: '2px solid #e0e0e0'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--primary-green)' }}>
                          {score.courseName}
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: 'var(--primary-green)'
                        }}>
                          {score.totalScore}타
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                        📅 {new Date(score.date).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showIncomeModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={handleCloseIncomeModal}>
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                회원 선택 및 금액 입력
              </h3>
              <button
                onClick={handleCloseIncomeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: 'var(--text-dark)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                라운딩 선택 (옵션)
              </label>
              <select
                value={selectedIncome.bookingId || ''}
                onChange={(e) => {
                  const newBookingId = e.target.value || null;
                  setSelectedIncome({...selectedIncome, bookingId: newBookingId});
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">선택 안함</option>
                {bookings.filter(b => b.type !== '컴페티션').map(booking => (
                  <option key={booking.id} value={booking.id}>
                    {booking.title || booking.courseName} - {new Date(booking.date).toLocaleDateString('ko-KR')}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                금액
              </label>
              <input
                type="number"
                value={selectedIncome.amount}
                onChange={(e) => setSelectedIncome({...selectedIncome, amount: e.target.value})}
                placeholder="금액 입력"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                이름 수동 입력 (옵션)
              </label>
              <input
                type="text"
                value={selectedIncome.manualName}
                onChange={(e) => setSelectedIncome({...selectedIncome, manualName: e.target.value})}
                placeholder="회원 목록에 없는 이름 입력"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ 
              borderTop: '1px solid var(--border-color)',
              paddingTop: '16px',
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                onClick={handleToggleAllMembers}
              >
                <input
                  type="checkbox"
                  checked={(() => {
                    const allMembers = contextMembers || members || [];
                    const sortedMembers = getSortedMembers();
                    const selectedBooking = bookings.find(b => b.id === selectedIncome.bookingId);
                    const guests = getGuestsFromBooking();
                    
                    if (selectedIncome.bookingId && selectedBooking) {
                      const participantData = selectedBooking.participants || [];
                      const participantPhones = participantData.map(p => {
                        if (typeof p === 'string') {
                          try {
                            const parsed = JSON.parse(p);
                            return parsed.phone;
                          } catch (e) {
                            return p;
                          }
                        }
                        return p?.phone || p;
                      });
                      
                      const participantMembers = allMembers.filter(m => m.isActive && participantPhones.includes(m.phone));
                      const totalSelected = selectedMembers.length + selectedGuests.length;
                      const totalParticipants = participantMembers.length + guests.length;
                      return totalSelected === totalParticipants && 
                             participantMembers.every(m => selectedMembers.includes(m.id)) &&
                             guests.every(g => selectedGuests.includes(g.phone)) &&
                             totalParticipants > 0;
                    } else {
                      return selectedMembers.length === sortedMembers.length && sortedMembers.length > 0;
                    }
                  })()}
                  onChange={handleToggleAllMembers}
                  style={{
                    width: '18px',
                    height: '18px',
                    marginRight: '12px',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '15px', fontWeight: '600' }}>전체 선택</span>
                <span style={{ marginLeft: 'auto', fontSize: '13px', opacity: 0.7 }}>
                  {(() => {
                    const allMembers = contextMembers || members || [];
                    const sortedMembers = getSortedMembers();
                    const selectedBooking = bookings.find(b => b.id === selectedIncome.bookingId);
                    const guests = getGuestsFromBooking();
                    
                    if (selectedIncome.bookingId && selectedBooking) {
                      const participantData = selectedBooking.participants || [];
                      const participantPhones = participantData.map(p => {
                        if (typeof p === 'string') {
                          try {
                            const parsed = JSON.parse(p);
                            return parsed.phone;
                          } catch (e) {
                            return p;
                          }
                        }
                        return p?.phone || p;
                      });
                      
                      const participantMembers = allMembers.filter(m => m.isActive && participantPhones.includes(m.phone));
                      const selectedParticipantsCount = selectedMembers.filter(id => participantMembers.some(m => m.id === id)).length + selectedGuests.length;
                      const totalParticipants = participantMembers.length + guests.length;
                      return `${selectedParticipantsCount} / ${totalParticipants}`;
                    } else {
                      return `${selectedMembers.length} / ${sortedMembers.length}`;
                    }
                  })()}
                </span>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '20px', WebkitOverflowScrolling: 'touch' }}>
                {(() => {
                  const sortedMembers = getSortedMembers();
                  const selectedBooking = bookings.find(b => b.id === selectedIncome.bookingId);
                  const hasBooking = !!selectedIncome.bookingId && !!selectedBooking;
                  
                  let participantPhones = [];
                  if (hasBooking) {
                    const participantData = selectedBooking.participants || [];
                    participantPhones = participantData.map(p => {
                      if (typeof p === 'string') {
                        try {
                          const parsed = JSON.parse(p);
                          return parsed.phone;
                        } catch (e) {
                          return p;
                        }
                      }
                      return p?.phone || p;
                    });
                  }
                  
                  const participantMembers = hasBooking ? sortedMembers.filter(m => participantPhones.includes(m.phone)) : [];
                  const nonParticipantMembers = hasBooking ? sortedMembers.filter(m => !participantPhones.includes(m.phone)) : sortedMembers;
                  
                  return (
                    <>
                      {participantMembers.map(member => (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            background: 'var(--bg-green)'
                          }}
                          onClick={() => handleToggleMember(member.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleMember(member.id);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginRight: '12px',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '600' }}>
                              {member.nickname || member.name}
                            </div>
                          </div>
                          <div style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            background: 'var(--primary-green)',
                            color: 'white',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            참가
                          </div>
                        </div>
                      ))}
                      
                      {/* 외부 게스트 표시 */}
                      {hasBooking && getGuestsFromBooking().map(guest => (
                        <div
                          key={guest.phone}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            borderBottom: '1px solid #87CEEB',
                            cursor: 'pointer',
                            background: 'rgba(135, 206, 235, 0.15)'
                          }}
                          onClick={() => handleToggleGuest(guest.phone)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGuests.includes(guest.phone)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleGuest(guest.phone);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginRight: '12px',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '600', color: '#4A90A4' }}>
                              {guest.name}
                            </div>
                            {guest.memberNumber && (
                              <div style={{ fontSize: '13px', opacity: 0.7, color: '#4A90A4' }}>
                                {guest.memberNumber}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            padding: '4px 8px',
                            background: '#87CEEB',
                            color: '#1a3a4a',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            외부게스트
                          </div>
                        </div>
                      ))}
                      
                      {hasBooking && (participantMembers.length > 0 || getGuestsFromBooking().length > 0) && nonParticipantMembers.length > 0 && (
                        <div style={{
                          padding: '10px 12px',
                          background: 'var(--bg-card)',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: 'var(--text-secondary)',
                          borderTop: '2px solid var(--border-color)',
                          borderBottom: '2px solid var(--border-color)',
                          textAlign: 'center'
                        }}>
                          미참가 회원
                        </div>
                      )}
                      
                      {nonParticipantMembers.map(member => (
                        <div
                          key={member.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '12px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            background: 'transparent'
                          }}
                          onClick={() => handleToggleMember(member.id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleMember(member.id);
                            }}
                            style={{
                              width: '18px',
                              height: '18px',
                              marginRight: '12px',
                              cursor: 'pointer'
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '15px', fontWeight: '600' }}>
                              {member.nickname || member.name}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', flexShrink: 0 }}>
              <button
                onClick={handleCloseIncomeModal}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleProcessIncome}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }} onClick={handleCloseRefundModal}>
          <div 
            style={{
              background: 'white',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '24px 24px 16px 24px',
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid var(--border-color)'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>
                회원 및 금액 선택
              </h3>
              <button
                onClick={handleCloseRefundModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  color: 'var(--text-dark)'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: '24px'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  라운딩 선택 (옵션)
                </label>
                <select
                  value={selectedExpense.bookingId || ''}
                  onChange={(e) => {
                    const newBookingId = e.target.value || null;
                    setSelectedExpense({...selectedExpense, bookingId: newBookingId});
                  }}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: 'white'
                  }}
                >
                  <option value="">선택 안함</option>
                  {bookings.filter(b => b.type !== '컴페티션').map(booking => (
                    <option key={booking.id} value={booking.id}>
                      {booking.title || booking.courseName} - {new Date(booking.date).toLocaleDateString('ko-KR')}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  금액
                </label>
                <input
                  type="number"
                  value={selectedExpense.amount}
                  onChange={(e) => setSelectedExpense({...selectedExpense, amount: e.target.value})}
                  placeholder="금액 입력"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  메모 (선택)
                </label>
                <input
                  type="text"
                  value={selectedExpense.memo || ''}
                  onChange={(e) => setSelectedExpense({...selectedExpense, memo: e.target.value})}
                  placeholder="메모 입력"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ 
                borderTop: '1px solid var(--border-color)',
                paddingTop: '16px'
              }}>
                <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>
                  회원 선택 (1명만 선택)
                </div>

                <div>
                  {(() => {
                    const allMembers = contextMembers || members || [];
                    const activeMembers = allMembers.filter(m => m.isActive);
                    const selectedBooking = bookings.find(b => b.id === selectedExpense.bookingId);
                    const hasBooking = !!selectedExpense.bookingId && !!selectedBooking;
                    
                    let participantPhones = [];
                    if (hasBooking) {
                      const participantData = selectedBooking.participants || [];
                      participantPhones = participantData.map(p => {
                        if (typeof p === 'string') {
                          try {
                            const parsed = JSON.parse(p);
                            return parsed.phone;
                          } catch (e) {
                            return p;
                          }
                        }
                        return p?.phone || p;
                      });
                    }
                    
                    const participantMembers = hasBooking ? activeMembers.filter(m => participantPhones.includes(m.phone)) : [];
                    const nonParticipantMembers = hasBooking ? activeMembers.filter(m => !participantPhones.includes(m.phone)) : activeMembers;
                    
                    return (
                      <>
                        {participantMembers.map(member => (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              background: selectedExpense.memberId === member.id ? 'var(--bg-green)' : 'transparent'
                            }}
                            onClick={() => setSelectedExpense({...selectedExpense, memberId: member.id})}
                          >
                            <input
                              type="radio"
                              checked={selectedExpense.memberId === member.id}
                              onChange={() => setSelectedExpense({...selectedExpense, memberId: member.id})}
                              style={{
                                width: '18px',
                                height: '18px',
                                marginRight: '12px',
                                cursor: 'pointer'
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '15px', fontWeight: '600' }}>
                                {member.nickname || member.name}
                              </div>
                            </div>
                            <div style={{
                              fontSize: '12px',
                              padding: '4px 8px',
                              background: 'var(--primary-green)',
                              color: 'white',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              참가
                            </div>
                          </div>
                        ))}
                        
                        {hasBooking && participantMembers.length > 0 && nonParticipantMembers.length > 0 && (
                          <div style={{
                            padding: '10px 12px',
                            background: 'var(--bg-card)',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            borderTop: '2px solid var(--border-color)',
                            borderBottom: '2px solid var(--border-color)',
                            textAlign: 'center'
                          }}>
                            미참가 회원
                          </div>
                        )}
                        
                        {nonParticipantMembers.map(member => (
                          <div
                            key={member.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px',
                              borderBottom: '1px solid var(--border-color)',
                              cursor: 'pointer',
                              background: selectedExpense.memberId === member.id ? 'var(--bg-green)' : 'transparent'
                            }}
                            onClick={() => setSelectedExpense({...selectedExpense, memberId: member.id})}
                          >
                            <input
                              type="radio"
                              checked={selectedExpense.memberId === member.id}
                              onChange={() => setSelectedExpense({...selectedExpense, memberId: member.id})}
                              style={{
                                width: '18px',
                                height: '18px',
                                marginRight: '12px',
                                cursor: 'pointer'
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '15px', fontWeight: '600' }}>
                                {member.nickname || member.name}
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '16px 24px 24px 24px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex', 
              gap: '12px'
            }}>
              <button
                onClick={handleCloseRefundModal}
                disabled={isProcessingRefund}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isProcessingRefund ? 'not-allowed' : 'pointer',
                  opacity: isProcessingRefund ? 0.5 : 1
                }}
              >
                취소
              </button>
              <button
                onClick={async () => {
                  if (isProcessingRefund) return;
                  
                  setIsProcessingRefund(true);
                  const success = await handleClubExpense();
                  
                  if (success) {
                    const category = expenseCategories.find(c => c.id === selectedExpense.categoryId);
                    const member = members.find(m => m.id === selectedExpense.memberId);
                    const actionText = category?.name === '회원 크레딧' ? '크레딧' : '환불';
                    alert(`${member?.nickname || member?.name}님에게 $${selectedExpense.amount} ${actionText} 처리되었습니다.`);
                    handleCloseRefundModal();
                  }
                  
                  setIsProcessingRefund(false);
                }}
                disabled={isProcessingRefund}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isProcessingRefund ? '#999' : 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isProcessingRefund ? 'not-allowed' : 'pointer',
                  opacity: isProcessingRefund ? 0.7 : 1
                }}
              >
                {(() => {
                  if (isProcessingRefund) return '처리 중...';
                  const category = expenseCategories.find(c => c.id === selectedExpense.categoryId);
                  return category?.name === '회원 크레딧' ? '크레딧 지급' : '환불 처리';
                })()}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingTransaction && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setViewingTransaction(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              width: '90%',
              maxWidth: '450px',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700' }}>거래 상세</h3>
              <button
                onClick={() => setViewingTransaction(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>거래 ID</span>
                <span style={{ fontSize: '13px', wordBreak: 'break-all' }}>{viewingTransaction.id}</span>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>유형</span>
                <span style={{ fontSize: '13px' }}>
                  {viewingTransaction.type === 'payment' ? '회비 납부' :
                   viewingTransaction.type === 'expense' ? '지출' :
                   viewingTransaction.type === 'donation' ? '도네이션' :
                   viewingTransaction.type === 'charge' ? '청구' :
                   viewingTransaction.type === 'credit' ? '크레딧' : viewingTransaction.type}
                </span>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>금액</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: viewingTransaction.type === 'expense' || viewingTransaction.type === 'charge' ? '#ef4444' : '#22c55e' }}>
                  {viewingTransaction.type === 'expense' || viewingTransaction.type === 'charge' ? '-' : '+'}${viewingTransaction.amount}
                </span>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>거래 날짜</span>
                <span style={{ fontSize: '13px' }}>
                  {new Date(viewingTransaction.date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                </span>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>회원</span>
                <span style={{ fontSize: '13px' }}>{viewingTransaction.member?.nickname || viewingTransaction.member?.name || '-'}</span>
              </div>
              
              {viewingTransaction.booking && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>라운딩</span>
                  <span style={{ fontSize: '13px' }}>{viewingTransaction.booking.name}</span>
                </div>
              )}
              
              {viewingTransaction.type === 'expense' && viewingTransaction.category && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>지출항목</span>
                  <span style={{ fontSize: '13px' }}>{viewingTransaction.category}</span>
                </div>
              )}
              
              {viewingTransaction.type === 'expense' && viewingTransaction.memo && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>메모</span>
                  <span style={{ fontSize: '13px' }}>{viewingTransaction.memo}</span>
                </div>
              )}
              
              {viewingTransaction.type !== 'expense' && viewingTransaction.description && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>설명</span>
                  <span style={{ fontSize: '13px' }}>{viewingTransaction.description}</span>
                </div>
              )}
              
              {viewingTransaction.executor && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>집행자</span>
                  <span style={{ fontSize: '13px' }}>{viewingTransaction.executor.nickname || viewingTransaction.executor.name}</span>
                </div>
              )}
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>생성일시</span>
                <span style={{ fontSize: '13px' }}>
                  {new Date(viewingTransaction.createdAt).toLocaleString('ko-KR', { 
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>
              
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>수정일시</span>
                <span style={{ fontSize: '13px' }}>
                  {new Date(viewingTransaction.updatedAt).toLocaleString('ko-KR', { 
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  })}
                </span>
              </div>
              
              {viewingTransaction.receiptUrl && (
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>영수증</span>
                  <button
                    onClick={() => {
                      setViewingTransaction(null);
                      setShowReceiptModal(viewingTransaction.receiptUrl);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6366f1',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    영수증 보기
                  </button>
                </div>
              )}
              
              {viewingTransaction.memberId && (
                <div style={{ display: 'flex', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>회원 ID</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{viewingTransaction.memberId}</span>
                </div>
              )}
              
              {viewingTransaction.bookingId && (
                <div style={{ display: 'flex', paddingBottom: '8px' }}>
                  <span style={{ width: '100px', fontSize: '13px', color: 'var(--text-secondary)', flexShrink: 0 }}>라운딩 ID</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{viewingTransaction.bookingId}</span>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setViewingTransaction(null)}
              style={{
                width: '100%',
                marginTop: '16px',
                padding: '12px',
                background: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {editingTransaction && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setEditingTransaction(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '20px',
              width: '90%',
              maxWidth: '400px',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>거래 수정</h3>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                유형
              </label>
              <select
                value={editingTransaction.type || ''}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  type: e.target.value
                })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px'
                }}
              >
                <option value="payment">회비 납부</option>
                <option value="expense">지출</option>
                <option value="donation">도네이션</option>
                <option value="charge">청구</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                회원
              </label>
              <select
                value={editingTransaction.memberId || ''}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  memberId: e.target.value || null
                })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px'
                }}
              >
                <option value="">회원 없음</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.nickname || member.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                날짜
              </label>
              <input
                type="date"
                value={editingTransaction.date?.split('T')[0] || ''}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  date: e.target.value
                })}
                style={{
                  width: '50%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                금액 ($)
              </label>
              <input
                type="number"
                value={editingTransaction.amount || ''}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  amount: parseFloat(e.target.value) || 0
                })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                라운딩 선택
              </label>
              <select
                value={editingTransaction.bookingId || ''}
                onChange={(e) => setEditingTransaction({
                  ...editingTransaction,
                  bookingId: e.target.value || null
                })}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  background: 'white'
                }}
              >
                <option value="">라운딩 선택 안함</option>
                {bookings
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(booking => (
                    <option key={booking.id} value={booking.id}>
                      {booking.title || booking.courseName} ({new Date(booking.date).toLocaleDateString('ko-KR')})
                    </option>
                  ))
                }
              </select>
            </div>

            {editingTransaction.type === 'expense' && (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>
                  지출항목 *
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {expenseCategories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setEditingTransaction({
                        ...editingTransaction,
                        category: cat.name,
                        description: cat.name
                      })}
                      style={{
                        padding: '8px 12px',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: editingTransaction.category === cat.name ? '600' : '500',
                        background: editingTransaction.category === cat.name ? '#E59879' : '#f0f0f0',
                        color: editingTransaction.category === cat.name ? 'white' : 'var(--text-dark)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editingTransaction.type === 'expense' ? (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                  메모 (선택)
                </label>
                <textarea
                  value={editingTransaction.memo || ''}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    memo: e.target.value
                  })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                  placeholder="메모 입력 (선택)"
                />
              </div>
            ) : (
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                  설명
                </label>
                <input
                  type="text"
                  value={editingTransaction.description || ''}
                  onChange={(e) => setEditingTransaction({
                    ...editingTransaction,
                    description: e.target.value
                  })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '14px'
                  }}
                  placeholder="설명 입력 (선택)"
                />
              </div>
            )}

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                이미지 (영수증) {editingTransaction.type === 'expense' && <span style={{ fontWeight: '400', color: '#666' }}>- 여러 장 가능</span>}
              </label>
              {editingTransaction.type === 'expense' ? (
                <div>
                  {(editingTransaction.receiptImages || []).length > 0 && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '8px',
                      marginBottom: '8px'
                    }}>
                      {(editingTransaction.receiptImages || []).map((img, index) => (
                        <div key={index} style={{ position: 'relative' }}>
                          <img 
                            src={img} 
                            alt={`영수증 ${index + 1}`}
                            onClick={() => setShowReceiptModal(img)}
                            style={{ 
                              width: '100%', 
                              height: '70px', 
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              cursor: 'pointer'
                            }} 
                          />
                          <button
                            onClick={() => {
                              const newImages = [...(editingTransaction.receiptImages || [])];
                              newImages.splice(index, 1);
                              setEditingTransaction({
                                ...editingTransaction,
                                receiptImages: newImages
                              });
                            }}
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'var(--alert-red)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '12px',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#f9f9f9'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          alert('이미지 크기는 5MB 이하여야 합니다.');
                          return;
                        }
                        setEditImageUploading(true);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingTransaction(prev => ({
                            ...prev,
                            receiptImages: [...(prev.receiptImages || []), reader.result]
                          }));
                          setEditImageUploading(false);
                        };
                        reader.readAsDataURL(file);
                        e.target.value = '';
                      }}
                      style={{ display: 'none' }}
                    />
                    {editImageUploading ? (
                      <span style={{ color: '#666', fontSize: '13px' }}>업로드 중...</span>
                    ) : (
                      <span style={{ color: '#666', fontSize: '13px' }}>📷 이미지 추가</span>
                    )}
                  </label>
                </div>
              ) : (
                editingTransaction.receiptImage ? (
                  <div style={{ position: 'relative' }}>
                    <img 
                      src={editingTransaction.receiptImage} 
                      alt="영수증" 
                      onClick={() => setShowReceiptModal(editingTransaction.receiptImage)}
                      style={{ 
                        width: '100%', 
                        maxHeight: '120px', 
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        cursor: 'pointer'
                      }} 
                    />
                    <button
                      onClick={() => setEditingTransaction({
                        ...editingTransaction,
                        receiptImage: ''
                      })}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'var(--alert-red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    border: '2px dashed var(--border-color)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: '#f9f9f9'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) {
                          alert('이미지 크기는 5MB 이하여야 합니다.');
                          return;
                        }
                        setEditImageUploading(true);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditingTransaction(prev => ({
                            ...prev,
                            receiptImage: reader.result
                          }));
                          setEditImageUploading(false);
                        };
                        reader.readAsDataURL(file);
                      }}
                      style={{ display: 'none' }}
                    />
                    {editImageUploading ? (
                      <span style={{ color: '#666', fontSize: '13px' }}>업로드 중...</span>
                    ) : (
                      <span style={{ color: '#666', fontSize: '13px' }}>📷 이미지 업로드</span>
                    )}
                  </label>
                )
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => setEditingTransaction(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                disabled={isUpdatingTransaction}
                onClick={async () => {
                  setIsUpdatingTransaction(true);
                  try {
                    const updateData = {
                      amount: editingTransaction.amount,
                      date: editingTransaction.date,
                      description: editingTransaction.description,
                      bookingId: editingTransaction.bookingId || null
                    };
                    
                    if (editingTransaction.type === 'expense') {
                      updateData.category = editingTransaction.category || null;
                      updateData.memo = editingTransaction.memo || null;
                      updateData.receiptImages = editingTransaction.receiptImages || [];
                    } else {
                      updateData.receiptImage = editingTransaction.receiptImage || null;
                    }
                    
                    const updated = await apiService.updateTransaction(editingTransaction.id, updateData);
                    setAllTransactions(prev => prev.map(t => 
                      t.id === updated.id ? updated : t
                    ));
                    setEditingTransaction(null);
                    setSelectedTransactionIds([]);
                    setIsTransactionSelectMode(false);
                    setIsUpdatingTransaction(false);
                    loadLedgerData().catch(err => console.error('Reload error:', err));
                    return;
                  } catch (error) {
                    console.error('Failed to update transaction:', error);
                    alert('수정에 실패했습니다.');
                    setIsUpdatingTransaction(false);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: isUpdatingTransaction ? '#ccc' : 'var(--primary-green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isUpdatingTransaction ? 'not-allowed' : 'pointer'
                }}
              >
                {isUpdatingTransaction ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReceiptModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setShowReceiptModal(null)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '16px',
              maxWidth: '90%',
              maxHeight: '90%',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowReceiptModal(null)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'var(--primary-green)',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', fontWeight: '600' }}>영수증</h3>
            <img 
              src={showReceiptModal} 
              alt="영수증" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '70vh',
                borderRadius: '8px'
              }} 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(Admin);
