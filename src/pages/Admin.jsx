import React, { useState, useEffect, useRef, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import CrownIcon from '../components/CrownIcon';
import LoadingButton, { LoadingOverlay } from '../components/LoadingButton';
import SearchableDropdown from '../components/SearchableDropdown';

function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addFee, courses, addCourse, refreshMembers, refreshCourses, members: contextMembers, clubLogo, updateClubLogo } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
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
    memberId: 'all'
  });
  const [summaryBookingFilter, setSummaryBookingFilter] = useState('all');
  const [selectedSummaryCategories, setSelectedSummaryCategories] = useState([]);
  const [isTransactionSelectMode, setIsTransactionSelectMode] = useState(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState([]);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
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
    description: '',
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
  const [clubIntroText, setClubIntroText] = useState('');
  const [savedClubIntroText, setSavedClubIntroText] = useState('');
  const [clubRulesText, setClubRulesText] = useState('');
  const [savedClubRulesText, setSavedClubRulesText] = useState('');
  const [appDescriptionText, setAppDescriptionText] = useState('');
  const [savedAppDescriptionText, setSavedAppDescriptionText] = useState('');
  
  // 스코어 관리 상태
  const [scoreManagementView, setScoreManagementView] = useState('rounds'); // 'rounds', 'leaderboard', 'scorecard', 'allScores'
  const [allScoresData, setAllScoresData] = useState([]);
  const [selectedScoreIds, setSelectedScoreIds] = useState([]);
  const [selectedRoundForScore, setSelectedRoundForScore] = useState(null);
  const [selectedPlayerForScore, setSelectedPlayerForScore] = useState(null);
  const [roundScores, setRoundScores] = useState([]);
  const [editingScore, setEditingScore] = useState(null);
  const [editScoreData, setEditScoreData] = useState(null);

  const features = [
    { id: 'create_rounding', name: '라운딩 생성' },
    { id: 'edit_rounding', name: '라운딩 수정/삭제' },
    { id: 'team_formation', name: '조편성' },
    { id: 'participant_management', name: '참가자 관리' },
    { id: 'score_entry', name: '스코어 입력' },
    { id: 'fee_management', name: '클럽회계관리' },
    { id: 'delete_transaction', name: '거래내역 삭제' },
    { id: 'course_management', name: '골프장 관리' },
    { id: 'create_post', name: '게시판 작성' },
    { id: 'member_approval', name: '회원 승인' },
    { id: 'fee_exemption', name: '참가비 면제선택' }
  ];

  useEffect(() => {
    if (location.state?.reset) {
      setActiveTab('menu');
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    if (contextMembers) {
      setMembers(contextMembers);
    }
  }, [contextMembers]);

  useEffect(() => {
    if (activeTab === 'settings' || activeTab === 'developer') {
      loadPermissions();
      loadCategories();
    }
    if (activeTab === 'fees') {
      loadFeeDataFast();
    }
    if (activeTab === 'ledger') {
      loadLedgerData();
    }
    if (activeTab === 'scoreManagement') {
      loadBookingsForScoreManagement();
    }
  }, [activeTab]);

  const loadBookingsForScoreManagement = async () => {
    try {
      const bookingsData = await apiService.fetchBookings();
      setBookings(bookingsData || []);
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
      // 1단계: 캐시된 항목 즉시 표시
      const cachedIncome = sessionStorage.getItem('incomeCategories');
      const cachedExpense = sessionStorage.getItem('expenseCategories');
      const cachedBookings = sessionStorage.getItem('feeBookings');
      
      if (cachedIncome) setIncomeCategories(JSON.parse(cachedIncome));
      if (cachedExpense) setExpenseCategories(JSON.parse(cachedExpense));
      if (cachedBookings) setBookings(JSON.parse(cachedBookings));
      
      // 2단계: 중요한 데이터만 먼저 로드 (빠른 표시)
      const [balanceData, outstandingData] = await Promise.all([
        apiService.fetchClubBalance(),
        apiService.fetchOutstandingBalances()
      ]);
      
      setClubBalance(balanceData.balance);
      setOutstandingBalances(outstandingData);
      
      // 3단계: 나머지 데이터 백그라운드 로드 (라운딩은 항상 최신 데이터)
      const [transactionsData, incomeCats, expenseCats, bookingsData] = await Promise.all([
        apiService.fetchTransactions(50),
        cachedIncome ? Promise.resolve(JSON.parse(cachedIncome)) : apiService.fetchIncomeCategories(),
        cachedExpense ? Promise.resolve(JSON.parse(cachedExpense)) : apiService.fetchExpenseCategories(),
        apiService.fetchBookings() // 항상 최신 라운딩 데이터 가져오기
      ]);
      
      // 거래 내역에 누적 클럽 잔액 계산
      let runningBalance = 0;
      const transactionsWithBalance = transactionsData.reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense') {
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
      const [balanceData, outstandingData, transactionsData, incomeCats, expenseCats, bookingsData] = await Promise.all([
        apiService.fetchClubBalance(),
        apiService.fetchOutstandingBalances(),
        apiService.fetchTransactions(),
        apiService.fetchIncomeCategories(),
        apiService.fetchExpenseCategories(),
        apiService.fetchBookings()
      ]);
      setClubBalance(balanceData.balance);
      setOutstandingBalances(outstandingData);
      setRecentTransactions(transactionsData.slice(0, 10));
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
      // 캐시 업데이트
      sessionStorage.setItem('incomeCategories', JSON.stringify(income));
      sessionStorage.setItem('expenseCategories', JSON.stringify(expense));
    } catch (error) {
      console.error('항목 로드 실패:', error);
    }
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
    if (category?.name !== '환불') {
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
        
        // 회원 거래 처리
        selectedMembers.forEach(memberId => {
          const member = members.find(m => m.id === memberId);
          const transactionData = {
            type: isDonation ? 'donation' : 'charge',
            amount: parseFloat(selectedIncome.amount),
            description: `${category?.name}${isDonation ? '' : '청구'}${booking ? ` - ${booking.courseName}` : ''}${isDonation ? ` (${member.name})` : ''}`,
            date: selectedIncome.date,
            memberId: memberId,
            bookingId: selectedIncome.bookingId || null,
            createdBy: user.id
          };
          transactionPromises.push(apiService.createTransaction(transactionData));
        });
        
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
      const transactionsData = await apiService.fetchTransactions(50);
      let runningBalance = 0;
      const transactionsWithBalance = transactionsData.reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense') {
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
      
      // 환불인 경우 회원 선택 필수
      if (category?.name === '환불' && !selectedExpense.memberId) {
        alert('환불받을 회원을 선택해주세요.');
        return;
      }

      const booking = bookings.find(b => b.id === selectedExpense.bookingId);
      const member = members.find(m => m.id === selectedExpense.memberId);
      
      const transactionData = {
        type: 'expense',
        amount: parseFloat(selectedExpense.amount),
        description: `${category?.name}${booking ? ` - ${booking.courseName}` : ''}${member ? ` (${member.nickname || member.name})` : ''}${selectedExpense.description ? ` - ${selectedExpense.description}` : ''}`,
        date: selectedExpense.date,
        memberId: category?.name === '환불' ? selectedExpense.memberId : null,
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
        description: '',
        receiptImage: ''
      });
      
      // 병렬로 데이터 새로고침
      const [transactionsData] = await Promise.all([
        apiService.fetchTransactions(50),
        refreshBalanceAndOutstanding()
      ]);
      
      let runningBalance = 0;
      const transactionsWithBalance = transactionsData.reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense') {
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

      // 회원의 가장 최근 charge 거래에서 bookingId 찾기
      const memberTransactions = await apiService.fetchMemberTransactions(memberId);
      const recentCharge = memberTransactions.find(t => t.type === 'charge' && t.booking);
      const bookingId = recentCharge?.booking?.id || null;

      const transactionData = {
        type: 'payment',
        amount: Math.abs(amount),
        description: '회비 납부 (전액)',
        date: new Date().toISOString().split('T')[0],
        memberId: memberId,
        bookingId: bookingId,
        createdBy: user.id
      };

      await apiService.createTransaction(transactionData);
      alert(`${member.nickname || member.name}님의 회비가 전액 납부되었습니다.`);
      
      // 거래 내역 포함 전체 데이터 새로고침
      await Promise.all([
        refreshBalanceAndOutstanding(),
        refreshMembers ? refreshMembers() : Promise.resolve()
      ]);
      
      // 최근 거래 내역 다시 불러오기
      const transactionsData = await apiService.fetchTransactions(50);
      let runningBalance = 0;
      const transactionsWithBalance = transactionsData.reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense') {
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

      // 회원의 가장 최근 charge 거래에서 bookingId 찾기
      const memberTransactions = await apiService.fetchMemberTransactions(memberId);
      const recentCharge = memberTransactions.find(t => t.type === 'charge' && t.booking);
      const bookingId = recentCharge?.booking?.id || null;

      const transactionData = {
        type: 'payment',
        amount: amount,
        description: '회비 납부 (부분)',
        date: new Date().toISOString().split('T')[0],
        memberId: memberId,
        bookingId: bookingId,
        createdBy: user.id
      };

      await apiService.createTransaction(transactionData);
      alert(`${member.nickname || member.name}님의 ${amount.toLocaleString()}원이 납부 처리되었습니다.`);
      
      // 거래 내역 포함 전체 데이터 새로고침
      await Promise.all([
        refreshBalanceAndOutstanding(),
        refreshMembers ? refreshMembers() : Promise.resolve()
      ]);
      
      // 최근 거래 내역 다시 불러오기
      const transactionsData = await apiService.fetchTransactions(50);
      let runningBalance = 0;
      const transactionsWithBalance = transactionsData.reverse().map(t => {
        if (t.type === 'payment' || t.type === 'donation') {
          runningBalance += t.amount;
        } else if (t.type === 'expense') {
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

  const loadLedgerData = async () => {
    try {
      setIsLoadingTransactions(true);
      if (refreshMembers) {
        await refreshMembers();
      }
      const [transactionsData, balanceData] = await Promise.all([
        apiService.fetchTransactions(),
        apiService.fetchClubBalance()
      ]);
      setAllTransactions(transactionsData || []);
      setClubBalance(balanceData.balance);
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
        userId: member.id,
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
        <div className="header">
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              fontWeight: '700',
              cursor: 'pointer',
              padding: '0',
              color: 'var(--text-light)',
              minWidth: '24px'
            }}
          >
            ‹
          </button>
          <h1 style={{ flex: 1, marginLeft: '12px' }}>관리자</h1>
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              cursor: 'pointer'
            }}
            onClick={() => navigate('/mypage')}
          >
            <div style={{ fontSize: '14px', fontWeight: '500' }}>
              {user.nickname || user.name}
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: 'var(--primary-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '600',
                fontSize: '14px',
                border: '2px solid var(--border-color)'
              }}>
                {user.profileImage ? (
                  <img 
                    src={user.profileImage} 
                    alt="프로필" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }} 
                  />
                ) : (
                  <span>{(user.nickname || user.name).charAt(0)}</span>
                )}
              </div>
              {user.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  zIndex: 10
                }}>
                  <CrownIcon role={user.role} size={16} />
                </div>
              )}
            </div>
          </div>
        </div>
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
      <div className="header">
        <button
          onClick={() => {
            if (activeTab !== 'menu') {
              setActiveTab('menu');
              setScoreManagementView('rounds');
              setSelectedRoundForScore(null);
              setSelectedPlayerForScore(null);
            } else {
              navigate(-1);
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            fontWeight: '700',
            cursor: 'pointer',
            padding: '0',
            color: 'var(--text-light)',
            minWidth: '24px'
          }}
        >
          ‹
        </button>
        <h1 style={{ flex: 1, marginLeft: '12px' }}>관리자</h1>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => navigate('/mypage')}
        >
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-light)' }}>
            환영합니다 {user.nickname || user.name}님
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--primary-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '600',
              fontSize: '14px',
              border: '2px solid var(--border-color)'
            }}>
              {user.photo ? (
                <img 
                  src={user.photo} 
                  alt="프로필" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }} 
                />
              ) : (
                <span>{(user.nickname || user.name).charAt(0)}</span>
              )}
            </div>
            {user.role && ['관리자', '방장', '운영진', '클럽운영진'].includes(user.role) && (
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                zIndex: 10
              }}>
                <CrownIcon role={user.role} size={16} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {activeTab === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            <button
              onClick={() => setActiveTab('members')}
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                background: 'var(--bg-page)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>≡</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    회원 관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    회원 정보 조회 및 수정
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('fees')}
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                background: 'var(--bg-page)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>$</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    클럽회계관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    참가비 등록 및 납부 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('ledger')}
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                background: 'var(--bg-page)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>📖</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    통합 장부
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    모든 거래 내역 조회
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('courses')}
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                background: 'var(--bg-page)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>⚑</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    골프장 관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    골프장 등록 및 관리
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
            </button>

            <button
              onClick={() => setActiveTab('scoreManagement')}
              style={{
                padding: '16px',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s',
                background: 'var(--bg-page)',
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: '1px solid var(--border-color)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>🏌</div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                    스코어 관리
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    라운딩별 스코어 조회 및 수정
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
            </button>

            {['관리자', '방장', '운영진'].includes(user.role) && (
              <button
                onClick={() => setActiveTab('settings')}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                  background: 'var(--bg-page)',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: '1px solid var(--border-color)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>⚙</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                      앱 설정
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                      앱 기본 설정 관리
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
              </button>
            )}

            {user.role === '관리자' && (
              <button
                onClick={() => setActiveTab('developer')}
                style={{
                  padding: '16px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s',
                  background: 'var(--bg-page)',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: '1px solid var(--border-color)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-green)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-page)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ fontSize: '28px', color: 'var(--primary-green)' }}>🔧</div>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', color: 'var(--text-dark)' }}>
                      개발자 메뉴
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                      권한 설정 및 앱 소개문구 관리
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '24px', color: 'var(--text-dark)', opacity: 0.7 }}>›</div>
              </button>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            {/* 회원 검색 */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="이름 또는 대화명으로 검색..."
                  value={memberSearchTerm}
                  onChange={(e) => setMemberSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    paddingLeft: '44px',
                    fontSize: '15px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    boxSizing: 'border-box'
                  }}
                />
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '18px',
                  opacity: 0.5
                }}>
                  🔍
                </span>
                {memberSearchTerm && (
                  <button
                    onClick={() => setMemberSearchTerm('')}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: '#999',
                      padding: '4px'
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {members.filter(m => m.approvalStatus === 'pending' && 
              (memberSearchTerm === '' || 
               m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
               m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).length > 0 && (
              <div className="card" style={{ marginBottom: '16px', background: '#FFF3E0', border: '2px solid #FF9800' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#FF9800' }}>
                  승인 대기 중 ({members.filter(m => m.approvalStatus === 'pending' && 
                    (memberSearchTerm === '' || 
                     m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                     m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).length})
                </h3>
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
            
            <div className="card">
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '16px' 
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  전체 회원 ({members.filter(m => 
                    (showInactive || m.isActive !== false) &&
                    (memberSearchTerm === '' || 
                     m.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                     m.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).length})
                </h3>
                <button
                  onClick={() => setShowInactive(!showInactive)}
                  style={{
                    padding: '8px 16px',
                    background: showInactive ? 'var(--primary-green)' : 'var(--bg-card)',
                    color: showInactive ? 'white' : 'var(--primary-green)',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {showInactive ? '✓ 비활성 회원 포함' : '활성 회원만 보기'}
                </button>
              </div>
              {members.filter(member => 
                (showInactive || member.isActive !== false) &&
                (memberSearchTerm === '' || 
                 member.name?.toLowerCase().includes(memberSearchTerm.toLowerCase()) || 
                 member.nickname?.toLowerCase().includes(memberSearchTerm.toLowerCase()))).map(member => {
                const handicapDisplay = member.golflinkNumber 
                  ? `GA(${member.handicap})` 
                  : `HH(${member.handicap})`;
                
                return (
                  <div 
                    key={member.id}
                    onClick={() => navigate(`/member/${member.id}`)}
                    style={{
                      padding: '12px',
                      background: member.isActive === false ? '#f5f5f5' : 'var(--bg-card)',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      opacity: member.isActive === false ? 0.6 : 1,
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-green)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = member.isActive === false ? '#f5f5f5' : 'var(--bg-card)';
                      e.currentTarget.style.transform = 'translateX(0)';
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

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '700', 
                        fontSize: '16px',
                        marginBottom: '4px',
                        color: 'var(--primary-green)'
                      }}>
                        {member.nickname || member.name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', opacity: 0.7 }}>
                        {member.name}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '15px',
                      fontWeight: '700',
                      color: 'var(--primary-green)',
                      textAlign: 'right',
                      flexShrink: 0
                    }}>
                      {handicapDisplay}
                    </div>
                  </div>
                );
              })}
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

            {showNewMemberForm && (
              <div className="card">
                <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                  새 회원 추가
                </h3>
                <input
                  type="text"
                  placeholder="이름"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="대화명 (닉네임)"
                  value={newMember.nickname}
                  onChange={(e) => setNewMember({ ...newMember, nickname: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="tel"
                  placeholder="전화번호 (예: 0100 123 456)"
                  value={newMember.phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setNewMember({ ...newMember, phone: digits });
                  }}
                  maxLength={12}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7 }}>
                    사진 (본인)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewMember({ ...newMember, photo: reader.result });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ marginBottom: '8px' }}
                  />
                  {newMember.photo && (
                    <div style={{ marginTop: '8px' }}>
                      <img 
                        src={newMember.photo} 
                        alt="미리보기" 
                        style={{ 
                          width: '100px', 
                          height: '100px', 
                          objectFit: 'cover', 
                          borderRadius: '8px',
                          border: '2px solid var(--border-color)'
                        }} 
                      />
                    </div>
                  )}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    성별
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="gender"
                        value="남"
                        checked={newMember.gender === '남'}
                        onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                      />
                      <span>남</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="gender"
                        value="여"
                        checked={newMember.gender === '여'}
                        onChange={(e) => setNewMember({ ...newMember, gender: e.target.value })}
                      />
                      <span>여</span>
                    </label>
                  </div>
                </div>
                <input
                  type="number"
                  placeholder="출생연도 (예: 1990)"
                  value={newMember.birthYear}
                  onChange={(e) => setNewMember({ ...newMember, birthYear: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <input
                  type="text"
                  placeholder="사는 지역 (예: Lidcombe, Ryde)"
                  value={newMember.region}
                  onChange={(e) => setNewMember({ ...newMember, region: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                    클럽 멤버이신가요?
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="isClubMember"
                        value="yes"
                        checked={newMember.isClubMember === 'yes'}
                        onChange={(e) => setNewMember({ ...newMember, isClubMember: e.target.value })}
                      />
                      <span>예</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="isClubMember"
                        value="no"
                        checked={newMember.isClubMember === 'no'}
                        onChange={(e) => setNewMember({ ...newMember, isClubMember: e.target.value })}
                      />
                      <span>아니오</span>
                    </label>
                  </div>
                </div>
                {newMember.isClubMember === 'yes' && (
                  <>
                    <select
                      value={newMember.club}
                      onChange={(e) => setNewMember({ ...newMember, club: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    >
                      <option value="">소속 클럽 선택</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.name}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Golflink Number"
                      value={newMember.golflinkNumber}
                      onChange={(e) => setNewMember({ ...newMember, golflinkNumber: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    />
                    <input
                      type="text"
                      placeholder="클럽 회원번호"
                      value={newMember.clubMemberNumber}
                      onChange={(e) => setNewMember({ ...newMember, clubMemberNumber: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    />
                    <input
                      type="number"
                      placeholder="핸디"
                      value={newMember.handicap}
                      onChange={(e) => setNewMember({ ...newMember, handicap: e.target.value })}
                      style={{ marginBottom: '12px' }}
                    />
                  </>
                )}
                <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="isAdmin"
                    checked={newMember.isAdmin}
                    onChange={(e) => setNewMember({ ...newMember, isAdmin: e.target.checked })}
                  />
                  <label htmlFor="isAdmin" style={{ fontSize: '14px' }}>관리자 권한 부여</label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button className="btn-outline" onClick={() => setShowNewMemberForm(false)}>
                    취소
                  </button>
                  <button className="btn-primary" onClick={handleAddMember}>
                    추가
                  </button>
                </div>
              </div>
            )}

            <button className="btn-primary" onClick={() => setShowNewMemberForm(!showNewMemberForm)}>
              {showNewMemberForm ? '취소' : '+ 새 회원 추가'}
            </button>
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
                    const isRefund = category?.name === '환불';
                    
                    return (
                      <>
                        {!isRefund && (
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

                        {isRefund ? (
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
                    <input
                      type="text"
                      value={selectedExpense.description}
                      onChange={(e) => setSelectedExpense({...selectedExpense, description: e.target.value})}
                      placeholder="추가 설명을 입력하세요"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px'
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
                    const isRefund = category?.name === '환불';
                    
                    if (isRefund) return null;
                    
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
                            padding: '12px 20px',
                            background: 'var(--primary-green)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '15px',
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
                            background: '#4CAF50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
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
                      {recentTransactions.filter(t => t.type !== 'charge').map(transaction => {
                        const typeColor =
                          transaction.type === 'payment' ? 'var(--success-green)' :
                          transaction.type === 'expense' ? 'var(--alert-red)' : 'var(--success-green)';

                        const sign = 
                          transaction.type === 'payment' || transaction.type === 'donation' ? '+' : '-';
                        
                        const bookingName = transaction.booking ? 
                          (transaction.booking.title || transaction.booking.courseName) : '-';

                        const isGuestTransaction = transaction.description?.includes('(외부게스트:');
                        const guestName = isGuestTransaction 
                          ? transaction.description.match(/\(외부게스트:\s*([^)]+)\)/)?.[1] 
                          : null;

                        let categoryName = '';
                        if (transaction.type === 'payment') {
                          categoryName = '회비 납부';
                        } else if (transaction.type === 'expense') {
                          const expenseDesc = transaction.description || '클럽 지출';
                          categoryName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                        } else if (transaction.type === 'donation') {
                          if (transaction.description?.startsWith('기타 - ')) {
                            categoryName = transaction.description.replace('기타 - ', '');
                          } else {
                            categoryName = '도네이션';
                          }
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
                              {transaction.receiptImage ? (
                                <span
                                  onClick={() => setShowReceiptModal(transaction.receiptImage)}
                                  style={{
                                    cursor: 'pointer',
                                    textDecoration: 'underline'
                                  }}
                                  title="영수증 보기"
                                >
                                  {sign}${transaction.amount.toLocaleString()}
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
                onChange={(e) => setSummaryBookingFilter(e.target.value)}
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
                {[...new Map(allTransactions
                  .filter(t => t.booking)
                  .map(t => [t.booking.id, t.booking])
                ).values()].map(booking => (
                  <option key={booking.id} value={booking.id}>
                    {booking.title || booking.courseName}
                  </option>
                ))}
              </select>
              
              {(() => {
                const filteredForSummary = allTransactions.filter(t => 
                  summaryBookingFilter === 'all' || t.bookingId === summaryBookingFilter
                );
                
                // 수입 합계 계산 (payment, donation)
                const incomeTotals = {};
                filteredForSummary.filter(t => t.type === 'payment').forEach(t => {
                  const catName = '회비 납부';
                  incomeTotals[catName] = (incomeTotals[catName] || 0) + t.amount;
                });
                filteredForSummary.filter(t => t.type === 'donation').forEach(t => {
                  let catName = '도네이션';
                  if (t.description?.startsWith('기타 - ')) {
                    catName = t.description.replace('기타 - ', '');
                  }
                  incomeTotals[catName] = (incomeTotals[catName] || 0) + t.amount;
                });
                
                // 지출 합계 계산 (expense)
                const expenseTotals = {};
                filteredForSummary.filter(t => t.type === 'expense').forEach(t => {
                  const expenseDesc = t.description || '기타 지출';
                  const catName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                  expenseTotals[catName] = (expenseTotals[catName] || 0) + t.amount;
                });
                
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
                onChange={(e) => setLedgerFilter({ ...ledgerFilter, memberId: e.target.value })}
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
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', margin: 0 }}>
                  거래 내역 ({
                    allTransactions
                      .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                      .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                      .filter(t => {
                        if (selectedSummaryCategories.length === 0) return true;
                        
                        let catKey = '';
                        if (t.type === 'payment') {
                          catKey = 'income:회비 납부';
                        } else if (t.type === 'donation') {
                          if (t.description?.startsWith('기타 - ')) {
                            catKey = `income:${t.description.replace('기타 - ', '')}`;
                          } else {
                            catKey = 'income:도네이션';
                          }
                        } else if (t.type === 'expense') {
                          const expenseDesc = t.description || '기타 지출';
                          const catName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                          catKey = `expense:${catName}`;
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
                                if (!confirm(`선택한 ${selectedTransactionIds.length}건의 거래를 삭제하시겠습니까?`)) return;
                                try {
                                  for (const id of selectedTransactionIds) {
                                    await apiService.deleteTransaction(id);
                                  }
                                  setAllTransactions(prev => prev.filter(t => !selectedTransactionIds.includes(t.id)));
                                  setSelectedTransactionIds([]);
                                  setIsTransactionSelectMode(false);
                                  loadClubFinanceData();
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
                .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                .filter(t => {
                  if (selectedSummaryCategories.length === 0) return true;
                  
                  let catKey = '';
                  if (t.type === 'payment') {
                    catKey = 'income:회비 납부';
                  } else if (t.type === 'donation') {
                    if (t.description?.startsWith('기타 - ')) {
                      catKey = `income:${t.description.replace('기타 - ', '')}`;
                    } else {
                      catKey = 'income:도네이션';
                    }
                  } else if (t.type === 'expense') {
                    const expenseDesc = t.description || '기타 지출';
                    const catName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                    catKey = `expense:${catName}`;
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
                                  .filter(t => t.type !== 'charge')
                                  .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                                  .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                                  .filter(t => {
                                    if (selectedSummaryCategories.length === 0) return true;
                                    let catKey = '';
                                    if (t.type === 'payment') {
                                      catKey = 'income:회비 납부';
                                    } else if (t.type === 'donation') {
                                      if (t.description?.startsWith('기타 - ')) {
                                        catKey = `income:${t.description.replace('기타 - ', '')}`;
                                      } else {
                                        catKey = 'income:도네이션';
                                      }
                                    } else if (t.type === 'expense') {
                                      const expenseDesc = t.description || '기타 지출';
                                      const catName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                                      catKey = `expense:${catName}`;
                                    }
                                    return selectedSummaryCategories.includes(catKey);
                                  })
                                  .map(t => t.id);
                                return filteredIds.length > 0 && filteredIds.every(id => selectedTransactionIds.includes(id));
                              })()}
                              onChange={(e) => {
                                const filteredIds = allTransactions
                                  .filter(t => t.type !== 'charge')
                                  .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                                  .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                                  .filter(t => {
                                    if (selectedSummaryCategories.length === 0) return true;
                                    let catKey = '';
                                    if (t.type === 'payment') {
                                      catKey = 'income:회비 납부';
                                    } else if (t.type === 'donation') {
                                      if (t.description?.startsWith('기타 - ')) {
                                        catKey = `income:${t.description.replace('기타 - ', '')}`;
                                      } else {
                                        catKey = 'income:도네이션';
                                      }
                                    } else if (t.type === 'expense') {
                                      const expenseDesc = t.description || '기타 지출';
                                      const catName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                                      catKey = `expense:${catName}`;
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
                        .filter(t => t.type !== 'charge')
                        .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                        .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                        .filter(t => {
                          if (selectedSummaryCategories.length === 0) return true;
                          
                          let catKey = '';
                          if (t.type === 'payment') {
                            catKey = 'income:회비 납부';
                          } else if (t.type === 'donation') {
                            if (t.description?.startsWith('기타 - ')) {
                              catKey = `income:${t.description.replace('기타 - ', '')}`;
                            } else {
                              catKey = 'income:도네이션';
                            }
                          } else if (t.type === 'expense') {
                            const expenseDesc = t.description || '기타 지출';
                            const catName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                            catKey = `expense:${catName}`;
                          }
                          
                          return selectedSummaryCategories.includes(catKey);
                        })
                        .map(transaction => {
                          const typeColor =
                            transaction.type === 'payment' ? 'var(--success-green)' :
                            transaction.type === 'expense' ? 'var(--alert-red)' : 'var(--success-green)';

                          const sign = 
                            transaction.type === 'payment' || transaction.type === 'donation' ? '+' : '-';
                          
                          const bookingName = transaction.booking ? 
                            (transaction.booking.title || transaction.booking.courseName) : '-';

                          const isGuestTx = transaction.description?.includes('(외부게스트:');
                          const guestTxName = isGuestTx 
                            ? transaction.description.match(/\(외부게스트:\s*([^)]+)\)/)?.[1] 
                            : null;

                          let categoryName = '';
                          if (transaction.type === 'payment') {
                            categoryName = '회비 납부';
                          } else if (transaction.type === 'expense') {
                            const expenseDesc = transaction.description || '클럽 지출';
                            categoryName = expenseDesc.includes(' - ') ? expenseDesc.split(' - ')[0] : expenseDesc;
                          } else if (transaction.type === 'donation') {
                            if (transaction.description?.startsWith('기타 - ')) {
                              categoryName = transaction.description.replace('기타 - ', '');
                            } else {
                              categoryName = '도네이션';
                            }
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
                                {transaction.receiptImage ? (
                                  <span
                                    onClick={() => setShowReceiptModal(transaction.receiptImage)}
                                    style={{
                                      cursor: 'pointer',
                                      textDecoration: 'underline'
                                    }}
                                    title="영수증 보기"
                                  >
                                    {sign}${transaction.amount.toLocaleString()}
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

        {activeTab === 'courses' && (
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
            {(scoreManagementView === 'rounds' || scoreManagementView === 'allScores') && (
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '16px',
                padding: '0 16px'
              }}>
                <button
                  onClick={() => setScoreManagementView('rounds')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: scoreManagementView === 'rounds' ? 'var(--primary-green)' : 'white',
                    color: scoreManagementView === 'rounds' ? 'white' : 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  라운딩별 스코어
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
                    padding: '12px',
                    background: scoreManagementView === 'allScores' ? 'var(--primary-green)' : 'white',
                    color: scoreManagementView === 'allScores' ? 'white' : 'var(--text-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  전체 스코어
                </button>
              </div>
            )}

            {scoreManagementView === 'rounds' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', padding: '0 16px' }}>
                  라운딩별 스코어
                </h3>
                {bookings.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏌️</div>
                    <div style={{ color: 'var(--text-dark)', opacity: 0.7 }}>등록된 라운딩이 없습니다</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {bookings.sort((a, b) => new Date(b.date) - new Date(a.date)).map(booking => (
                      <button
                        key={booking.id}
                        onClick={async () => {
                          setSelectedRoundForScore(booking);
                          try {
                            const dateStr = new Date(booking.date).toISOString().split('T')[0];
                            const res = await fetch(`/api/scores/booking/${encodeURIComponent(dateStr)}/${encodeURIComponent(booking.courseName)}`);
                            const data = await res.json();
                            setRoundScores(Array.isArray(data) ? data : []);
                          } catch (e) {
                            console.error('스코어 로드 에러:', e);
                            setRoundScores([]);
                          }
                          setScoreManagementView('leaderboard');
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
                  {selectedScoreIds.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!confirm(`선택한 ${selectedScoreIds.length}개의 스코어를 삭제하시겠습니까?`)) return;
                        try {
                          for (const id of selectedScoreIds) {
                            await fetch(`/api/scores/${id}`, { method: 'DELETE' });
                          }
                          setAllScoresData(prev => prev.filter(s => !selectedScoreIds.includes(s.id)));
                          setSelectedScoreIds([]);
                        } catch (e) {
                          console.error('스코어 삭제 에러:', e);
                          alert('삭제에 실패했습니다.');
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--alert-red)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      선택 삭제 ({selectedScoreIds.length})
                    </button>
                  )}
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
                  padding: '0 16px'
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
                </div>

                {(() => {
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
                                      <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                        {member?.nickname || member?.name || participant.nickname || participant.name}
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                        HC: {member?.handicap || '-'}
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
                                      holes: Array(18).fill('')
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
                                <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-dark)' }}>
                                  {member?.nickname || member?.name || '알 수 없음'}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-dark)', opacity: 0.7 }}>
                                  HC: {member?.handicap || '-'}
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
              <div style={{ background: '#1a1a2e', minHeight: '100vh', margin: '-16px', padding: '16px' }}>
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
                            holesData = Array(18).fill('');
                          }
                          setEditScoreData({
                            totalScore: selectedPlayerForScore.totalScore,
                            holes: holesData
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
                          if (window.confirm('이 스코어를 삭제하시겠습니까?')) {
                            try {
                              await fetch(`/api/scores/${selectedPlayerForScore.id}`, { method: 'DELETE' });
                              setRoundScores(prev => prev.filter(s => s.id !== selectedPlayerForScore.id));
                              setScoreManagementView('leaderboard');
                              setSelectedPlayerForScore(null);
                            } catch (e) {
                              console.error('삭제 에러:', e);
                              alert('삭제에 실패했습니다');
                            }
                          }
                        }}
                        style={{
                          background: '#e74c3c',
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
                  <div style={{
                    background: 'rgba(255,255,255,0.1)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: 'white', fontSize: '24px', fontWeight: '700' }}>
                      {selectedPlayerForScore.totalScore}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                      RANK {selectedPlayerForScore.rank}
                    </div>
                  </div>
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
                    if (diff <= -3) return '#1a5f5f'; // Ace/Albatross (dark teal)
                    if (diff === -2) return '#e67e22'; // Eagle (orange)
                    if (diff === -1) return '#f4d03f'; // Birdie (yellow)
                    if (diff === 0) return 'transparent'; // Par (white)
                    if (diff === 1) return '#eb984e'; // Bogey (light orange)
                    return '#e74c3c'; // Double bogey+ (red)
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
                          {scores.map((s, idx) => (
                            <div key={`score-${idx}`} style={{ 
                              textAlign: 'center', 
                              padding: '10px 4px',
                              background: s > 0 ? getScoreColor(s, pars[idx]) : 'transparent',
                              color: s > 0 && getScoreColor(s, pars[idx]) !== 'transparent' ? 'white' : '#333',
                              fontWeight: '700',
                              fontSize: '14px'
                            }}>
                              {hasHoleData ? (s > 0 ? s : '-') : '-'}
                            </div>
                          ))}
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '10px 4px', 
                            color: '#333', 
                            fontWeight: '700',
                            fontSize: '15px',
                            background: '#f5f5f5'
                          }}>
                            {hasHoleData ? totalScore : '-'}
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
                          background: '#1a5f5f',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Ace/Albatross</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#e67e22',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Eagle</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#f4d03f',
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
                          background: '#eb984e',
                          borderRadius: '4px'
                        }}>
                          <span style={{ color: 'white', fontSize: '11px', fontWeight: '600' }}>Bogey</span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          padding: '6px 10px',
                          background: '#e74c3c',
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
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      총 타수 <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="number"
                      value={editScoreData?.totalScore || ''}
                      onChange={(e) => setEditScoreData(prev => ({ ...prev, totalScore: parseInt(e.target.value) || 0 }))}
                      placeholder="예: 85"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '16px'
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
                      홀별 타수 (선택)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                      {(editScoreData?.holes || []).map((h, idx) => (
                        <div key={idx} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>{idx + 1}</div>
                          <input
                            type="number"
                            value={h || ''}
                            onChange={(e) => {
                              const newHoles = [...(editScoreData?.holes || [])];
                              newHoles[idx] = parseInt(e.target.value) || 0;
                              setEditScoreData(prev => ({ ...prev, holes: newHoles }));
                            }}
                            style={{
                              width: '100%',
                              padding: '8px 4px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              fontSize: '14px',
                              textAlign: 'center'
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
                              headers: { 'Content-Type': 'application/json' },
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
                              headers: { 'Content-Type': 'application/json' },
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
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                입금항목 관리
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 참가비 거래 시 사용할 입금 항목을 관리합니다
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newIncomeCategoryName}
                    onChange={(e) => setNewIncomeCategoryName(e.target.value)}
                    placeholder="새 입금항목명 입력..."
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleAddIncomeCategory}
                    style={{
                      padding: '12px 20px',
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + 추가
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {incomeCategories.map((category) => (
                  <div
                    key={category.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-green)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>
                      {category.name}
                    </div>
                    <button
                      onClick={() => handleDeleteIncomeCategory(category.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--alert-red)',
                        color: 'var(--text-light)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      × 삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>
                출금항목 관리
              </h3>
              <div style={{
                padding: '10px 12px',
                background: 'var(--bg-green)',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '12px',
                color: 'var(--text-dark)', opacity: 0.7
              }}>
                • 참가비 거래 시 사용할 출금 항목을 관리합니다
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={newExpenseCategoryName}
                    onChange={(e) => setNewExpenseCategoryName(e.target.value)}
                    placeholder="새 출금항목명 입력..."
                    style={{
                      flex: 1,
                      padding: '12px',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    onClick={handleAddExpenseCategory}
                    style={{
                      padding: '12px 20px',
                      background: 'var(--primary-green)',
                      color: 'var(--text-light)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    + 추가
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '8px' }}>
                {expenseCategories.map((category) => (
                  <div
                    key={category.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-green)',
                      borderRadius: '8px'
                    }}
                  >
                    <div style={{ fontSize: '15px', fontWeight: '600' }}>
                      {category.name}
                    </div>
                    <button
                      onClick={() => handleDeleteExpenseCategory(category.id)}
                      style={{
                        padding: '6px 12px',
                        background: 'var(--alert-red)',
                        color: 'var(--text-light)',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      × 삭제
                    </button>
                  </div>
                ))}
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
              marginBottom: '16px'
            }}>
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'var(--bg-green)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  cursor: 'pointer'
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

              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                              {member.name}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>
                              {member.nickname}
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
                              {member.name}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>
                              {member.nickname}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
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
                환불 회원 및 금액 선택
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

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                  환불 금액
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
                                {member.name}
                              </div>
                              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                {member.nickname}
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
                                {member.name}
                              </div>
                              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                                {member.nickname}
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
                    alert(`${member?.nickname || member?.name}님에게 ${category?.name} ${selectedExpense.amount}원이 처리되었습니다.`);
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
                {isProcessingRefund ? '처리 중...' : '환불 처리'}
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
              
              {viewingTransaction.description && (
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
              <div style={{ 
                padding: '10px 12px', 
                background: 'var(--bg-light)', 
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                {editingTransaction.type === 'payment' ? '회비 납부' :
                 editingTransaction.type === 'expense' ? '지출' :
                 editingTransaction.type === 'donation' ? '도네이션' : editingTransaction.type}
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: '600' }}>
                회원
              </label>
              <div style={{ 
                padding: '10px 12px', 
                background: 'var(--bg-light)', 
                borderRadius: '6px',
                fontSize: '14px'
              }}>
                {editingTransaction.member?.nickname || editingTransaction.member?.name || '-'}
              </div>
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
                      {booking.courseName} ({new Date(booking.date).toLocaleDateString('ko-KR')})
                    </option>
                  ))
                }
              </select>
            </div>

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
                    loadClubFinanceData();
                  } catch (error) {
                    console.error('Failed to update transaction:', error);
                    alert('수정에 실패했습니다.');
                  } finally {
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
