import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import apiService from '../services/api';
import CrownIcon from '../components/CrownIcon';

function Admin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, addFee, courses, addCourse, refreshMembers, refreshCourses, members: contextMembers } = useApp();
  const [activeTab, setActiveTab] = useState('menu');
  const [members, setMembers] = useState([]);
  const [showPermissionMenu, setShowPermissionMenu] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const menuRefs = useRef({});
  const [newCourse, setNewCourse] = useState({
    name: '',
    address: '',
    holePars: Array(18).fill(''),
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
  const [selectedExpense, setSelectedExpense] = useState({
    categoryId: '',
    bookingId: null,
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const features = [
    { id: 'create_rounding', name: '라운딩 생성' },
    { id: 'edit_rounding', name: '라운딩 수정/삭제' },
    { id: 'team_formation', name: '조편성' },
    { id: 'participant_management', name: '참가자 관리' },
    { id: 'score_entry', name: '스코어 입력' },
    { id: 'fee_management', name: '클럽회계관리' },
    { id: 'course_management', name: '골프장 관리' },
    { id: 'create_post', name: '게시판 작성' },
    { id: 'member_approval', name: '회원 승인' }
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
    if (activeTab === 'settings') {
      loadPermissions();
      loadCategories();
    }
    if (activeTab === 'fees') {
      loadFeeDataFast();
    }
    if (activeTab === 'ledger') {
      loadLedgerData();
    }
  }, [activeTab]);

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
      
      // 3단계: 나머지 데이터 백그라운드 로드
      const [transactionsData, incomeCats, expenseCats, bookingsData] = await Promise.all([
        apiService.fetchTransactions(50),
        cachedIncome ? Promise.resolve(JSON.parse(cachedIncome)) : apiService.fetchIncomeCategories(),
        cachedExpense ? Promise.resolve(JSON.parse(cachedExpense)) : apiService.fetchExpenseCategories(),
        cachedBookings ? Promise.resolve(JSON.parse(cachedBookings)) : apiService.fetchBookings()
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
    setShowIncomeModal(true);
  };

  const handleCloseIncomeModal = () => {
    setShowIncomeModal(false);
    setSelectedMembers([]);
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
      
      if (selectedMembers.length === participantMembers.length && 
          participantMembers.every(m => selectedMembers.includes(m.id))) {
        setSelectedMembers([]);
      } else {
        setSelectedMembers(participantMembers.map(m => m.id));
      }
    } else {
      if (selectedMembers.length === sortedMembers.length) {
        setSelectedMembers([]);
      } else {
        setSelectedMembers(sortedMembers.map(m => m.id));
      }
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
          bookingId: selectedIncome.bookingId || null
        };
        
        await apiService.createTransaction(transactionData);
        alert(`${selectedIncome.manualName.trim()}님의 ${isDonation ? '도네이션' : '입금'}이 클럽 잔고에 추가되었습니다.`);
      } 
      // 회원 선택이 있는 경우
      else if (selectedMembers.length > 0) {
        // 병렬 처리로 속도 개선
        const transactionPromises = selectedMembers.map(memberId => {
          const member = members.find(m => m.id === memberId);
          const transactionData = {
            type: isDonation ? 'donation' : 'charge',
            amount: parseFloat(selectedIncome.amount),
            description: `${category?.name}${booking ? ` - ${booking.courseName}` : ''}${isDonation ? ` (${member.name})` : ''}`,
            date: selectedIncome.date,
            memberId: memberId,
            bookingId: selectedIncome.bookingId || null
          };
          return apiService.createTransaction(transactionData);
        });

        await Promise.all(transactionPromises);

        if (isDonation) {
          alert(`${selectedMembers.length}명의 회원 도네이션이 클럽 잔고에 추가되었습니다.`);
        } else {
          alert(`${selectedMembers.length}명의 회원에게 참가비가 청구되었습니다.`);
        }
      } else {
        alert('회원을 선택하거나 이름을 수동으로 입력해주세요.');
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
      
      // 필요한 데이터만 빠르게 새로고침
      await refreshBalanceAndOutstanding();
      if (refreshMembers) await refreshMembers();
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
      const booking = bookings.find(b => b.id === selectedExpense.bookingId);
      
      const transactionData = {
        type: 'expense',
        amount: parseFloat(selectedExpense.amount),
        description: `${category?.name}${booking ? ` - ${booking.courseName}` : ''}${selectedExpense.description ? ` (${selectedExpense.description})` : ''}`,
        date: selectedExpense.date,
        memberId: null,
        bookingId: selectedExpense.bookingId || null
      };

      await apiService.createTransaction(transactionData);

      alert('클럽 출금이 처리되었습니다.');
      setSelectedExpense({
        categoryId: '',
        bookingId: null,
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
      
      // 필요한 데이터만 빠르게 새로고침
      await refreshBalanceAndOutstanding();
    } catch (error) {
      console.error('출금 처리 실패:', error);
      alert('출금 처리에 실패했습니다.');
    }
  };

  const handleFullPayment = async (memberId, amount) => {
    try {
      const member = members.find(m => m.id === memberId);
      if (!member) return;

      const transactionData = {
        type: 'payment',
        amount: Math.abs(amount),
        description: '미수금 전액 납부',
        date: new Date().toISOString().split('T')[0],
        memberId: memberId,
        bookingId: null
      };

      await apiService.createTransaction(transactionData);
      alert(`${member.nickname || member.name}님의 미수금이 전액 납부되었습니다.`);
      
      // 필요한 데이터만 빠르게 새로고침
      await refreshBalanceAndOutstanding();
      if (refreshMembers) await refreshMembers();
      
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

      const transactionData = {
        type: 'payment',
        amount: amount,
        description: '부분 납부',
        date: new Date().toISOString().split('T')[0],
        memberId: memberId,
        bookingId: null
      };

      await apiService.createTransaction(transactionData);
      alert(`${member.nickname || member.name}님의 ${amount.toLocaleString()}원이 납부 처리되었습니다.`);
      
      // 필요한 데이터만 빠르게 새로고침
      await refreshBalanceAndOutstanding();
      if (refreshMembers) await refreshMembers();
      
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
      if (refreshMembers) {
        await refreshMembers();
      }
      const transactionsData = await apiService.fetchTransactions();
      setAllTransactions(transactionsData || []);
    } catch (error) {
      console.error('장부 데이터 로드 실패:', error);
      setAllTransactions([]);
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
        memberId: (transactionForm.type === 'charge' || transactionForm.type === 'payment') ? transactionForm.memberId : null
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

    console.log('🔵 Admin: 회원 추가 시작');
    console.log('📤 데이터베이스에 저장 시도:', member);
    
    try {
      const createdMember = await apiService.createMember(member);
      console.log('✅ 데이터베이스에 저장 완료, 생성된 ID:', createdMember.id);
      
      if (refreshMembers) {
        await refreshMembers();
        console.log('✅ AppContext 회원 목록 새로고침 완료');
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
      console.error('❌ 데이터베이스 저장 실패:', error);
      alert('회원 추가 중 오류가 발생했습니다. 다시 시도해주세요.');
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
    if (!editMemberData.name || !editMemberData.phone) {
      alert('이름과 전화번호를 입력해주세요.');
      return;
    }

    if (editMemberData.phone.length !== 10 || !/^\d+$/.test(editMemberData.phone)) {
      alert('전화번호 10자리를 정확히 입력해주세요.');
      return;
    }

    try {
      await apiService.updateMember(editingMember, editMemberData);
      console.log('✅ 회원 정보 업데이트 완료');
      
      if (refreshMembers) {
        await refreshMembers();
      }
      
      setEditingMember(null);
      setEditMemberData(null);
      alert('회원 정보가 수정되었습니다.');
    } catch (error) {
      console.error('❌ 회원 정보 수정 실패:', error);
      alert('회원 정보 수정 중 오류가 발생했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingMember(null);
    setEditMemberData(null);
  };

  const handleAddCourse = async () => {
    if (!newCourse.name) {
      alert('골프장 이름을 입력해주세요.');
      return;
    }

    try {
      const courseData = {
        name: newCourse.name,
        address: newCourse.address,
        holePars: newCourse.holePars,
        isCompetition: newCourse.isCompetition
      };
      
      await apiService.createCourse(courseData);
      alert('골프장이 등록되었습니다.');
      
      setNewCourse({ 
        name: '', 
        address: '',
        holePars: Array(18).fill(''),
        isCompetition: false
      });
      
      if (refreshCourses) {
        await refreshCourses();
      }
    } catch (error) {
      console.error('❌ 골프장 등록 실패:', error);
      alert('골프장 등록 중 오류가 발생했습니다.');
    }
  };

  const handleHoleParChange = (holeIndex, value) => {
    const newHolePars = [...newCourse.holePars];
    newHolePars[holeIndex] = value === '' ? '' : parseInt(value) || '';
    setNewCourse({ ...newCourse, holePars: newHolePars });
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course.id);
    setEditCourseData({
      name: course.name || '',
      address: course.address || '',
      holePars: course.holePars || Array(18).fill(4),
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
      await apiService.updateCourse(editingCourse, editCourseData);
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

  const handleEditCourseHoleParChange = (holeIndex, value) => {
    const newHolePars = [...editCourseData.holePars];
    newHolePars[holeIndex] = parseInt(value) || 3;
    setEditCourseData({ ...editCourseData, holePars: newHolePars });
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
          onClick={() => activeTab !== 'menu' ? setActiveTab('menu') : navigate(-1)}
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

            {user.role === '관리자' && (
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
          </div>
        )}

        {activeTab === 'members' && (
          <div>
            {members.filter(m => m.approvalStatus === 'pending').length > 0 && (
              <div className="card" style={{ marginBottom: '16px', background: '#FFF3E0', border: '2px solid #FF9800' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#FF9800' }}>
                  승인 대기 중 ({members.filter(m => m.approvalStatus === 'pending').length})
                </h3>
                {members.filter(m => m.approvalStatus === 'pending').map(member => (
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
                  전체 회원 ({showInactive ? members.length : members.filter(m => m.isActive !== false).length})
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
              {members.filter(member => showInactive || member.isActive !== false).map(member => {
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
                <input
                  type="text"
                  placeholder="소속 클럽"
                  value={editMemberData.club}
                  onChange={(e) => setEditMemberData({ ...editMemberData, club: e.target.value })}
                  style={{ marginBottom: '12px' }}
                />
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
                          onClick={() => setSelectedIncome({...selectedIncome, categoryId: cat.id})}
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
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>

                  <button
                    onClick={handleOpenIncomeModal}
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
                            {booking.date} - {booking.courseName}
                          </option>
                        ))}
                    </select>
                  </div>

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
                      날짜
                    </label>
                    <input
                      type="date"
                      value={selectedExpense.date}
                      onChange={(e) => setSelectedExpense({...selectedExpense, date: e.target.value})}
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
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                최근 거래 내역 (최근 50건)
              </h3>
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
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>날짜</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>대화명</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>항목</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>라운딩</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>금액</th>
                        <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '600', whiteSpace: 'nowrap' }}>클럽잔액</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap' }}>집행자</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '600', whiteSpace: 'nowrap' }}>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map(transaction => {
                        const typeLabel = 
                          transaction.type === 'charge' ? '참가비 발생' :
                          transaction.type === 'payment' ? '납부' :
                          transaction.type === 'expense' ? '클럽 지출' : '도네이션';
                        
                        const typeColor =
                          transaction.type === 'charge' ? 'var(--alert-red)' :
                          transaction.type === 'payment' ? 'var(--success-green)' :
                          transaction.type === 'expense' ? 'var(--alert-red)' : 'var(--success-green)';

                        const sign = 
                          transaction.type === 'payment' || transaction.type === 'donation' ? '+' : '-';
                        
                        const bookingName = transaction.booking ? 
                          (transaction.booking.title || transaction.booking.courseName) : '-';

                        return (
                          <tr 
                            key={transaction.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)'
                            }}
                          >
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                              {new Date(transaction.date).toLocaleDateString('ko-KR', { 
                                month: '2-digit', 
                                day: '2-digit' 
                              })}
                            </td>
                            <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                              {transaction.member?.nickname || transaction.member?.name || '-'}
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ 
                                maxWidth: '150px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {transaction.description || typeLabel}
                              </div>
                            </td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ 
                                maxWidth: '120px', 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {bookingName}
                              </div>
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'right',
                              fontWeight: '600',
                              color: typeColor,
                              whiteSpace: 'nowrap'
                            }}>
                              {sign}${transaction.amount.toLocaleString()}
                            </td>
                            <td style={{ 
                              padding: '8px', 
                              textAlign: 'right',
                              fontWeight: '600',
                              color: 'var(--primary-green)',
                              whiteSpace: 'nowrap'
                            }}>
                              ${transaction.clubBalance?.toLocaleString() || '0'}
                            </td>
                            <td style={{ padding: '8px', fontSize: '11px', opacity: 0.7, whiteSpace: 'nowrap' }}>
                              by {user?.nickname || user?.name || '관리자'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--alert-red)',
                                  cursor: 'pointer',
                                  fontSize: '16px',
                                  padding: '0 4px'
                                }}
                                title="삭제"
                              >
                                ×
                              </button>
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
            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                필터
              </h3>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                <select
                  value={ledgerFilter.type}
                  onChange={(e) => setLedgerFilter({ ...ledgerFilter, type: e.target.value })}
                  style={{ marginBottom: '8px' }}
                >
                  <option value="all">전체 거래</option>
                  <option value="charge">참가비 발생</option>
                  <option value="payment">납부</option>
                  <option value="expense">클럽 지출</option>
                  <option value="donation">도네이션</option>
                </select>

                <select
                  value={ledgerFilter.memberId}
                  onChange={(e) => setLedgerFilter({ ...ledgerFilter, memberId: e.target.value })}
                >
                  <option value="all">전체 회원</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.nickname})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: '700' }}>
                거래 내역 ({
                  allTransactions
                    .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                    .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                    .length
                }건)
              </h3>

              {allTransactions
                .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
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
                <div>
                  {allTransactions
                    .filter(t => ledgerFilter.type === 'all' || t.type === ledgerFilter.type)
                    .filter(t => ledgerFilter.memberId === 'all' || t.memberId === ledgerFilter.memberId)
                    .map(transaction => {
                      const typeLabel = 
                        transaction.type === 'charge' ? '참가비 발생' :
                        transaction.type === 'payment' ? '납부' :
                        transaction.type === 'expense' ? '클럽 지출' : '도네이션';
                      
                      const typeColor =
                        transaction.type === 'charge' ? 'var(--alert-red)' :
                        transaction.type === 'payment' ? 'var(--success-green)' :
                        transaction.type === 'expense' ? 'var(--alert-red)' : 'var(--success-green)';

                      const sign = 
                        transaction.type === 'payment' || transaction.type === 'donation' ? '+' : '-';

                      const bgColor = 
                        transaction.type === 'payment' || transaction.type === 'donation' 
                          ? 'rgba(40, 167, 69, 0.05)' 
                          : 'rgba(220, 53, 69, 0.05)';

                      return (
                        <div 
                          key={transaction.id}
                          style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: bgColor
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '6px'
                            }}>
                              <div style={{
                                fontSize: '12px',
                                padding: '3px 8px',
                                borderRadius: '4px',
                                background: typeColor,
                                color: 'white',
                                fontWeight: '600'
                              }}>
                                {typeLabel}
                              </div>
                              {transaction.member && (
                                <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                  {transaction.member.name} ({transaction.member.nickname})
                                </div>
                              )}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.7 }}>
                              {new Date(transaction.date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            {transaction.description && (
                              <div style={{ fontSize: '13px', opacity: 0.8, marginTop: '6px' }}>
                                {transaction.description}
                              </div>
                            )}
                          </div>
                          <div style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: typeColor,
                            minWidth: '100px',
                            textAlign: 'right'
                          }}>
                            {sign}${transaction.amount.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
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
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '12px' 
                }}>
                  {newCourse.holePars.map((par, index) => (
                    <div 
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px',
                        background: 'var(--bg-green)',
                        borderRadius: '6px'
                      }}
                    >
                      <label style={{ 
                        fontSize: '14px', 
                        fontWeight: '600',
                        minWidth: '50px',
                        color: 'var(--primary-green)'
                      }}>
                        {index + 1}번홀
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="PAR"
                        value={par}
                        onChange={(e) => handleHoleParChange(index, e.target.value)}
                        min="3"
                        max="6"
                        style={{
                          width: '50px',
                          padding: '6px',
                          fontSize: '14px',
                          textAlign: 'center',
                          border: '2px solid var(--border-color)',
                          borderRadius: '4px'
                        }}
                      />
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
                  총 PAR: {newCourse.holePars.reduce((sum, par) => sum + (parseInt(par) || 0), 0)}
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
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(3, 1fr)', 
                    gap: '12px' 
                  }}>
                    {editCourseData.holePars.map((par, index) => (
                      <div 
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: 'var(--bg-green)',
                          borderRadius: '6px'
                        }}
                      >
                        <label style={{ 
                          fontSize: '14px', 
                          fontWeight: '600',
                          minWidth: '50px',
                          color: 'var(--primary-green)'
                        }}>
                          {index + 1}번홀
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={par}
                          onChange={(e) => handleEditCourseHoleParChange(index, e.target.value)}
                          min="3"
                          max="6"
                          style={{
                            width: '50px',
                            padding: '6px',
                            fontSize: '14px',
                            textAlign: 'center',
                            border: '2px solid var(--border-color)',
                            borderRadius: '4px'
                          }}
                        />
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
                    총 PAR: {editCourseData.holePars.reduce((sum, par) => sum + par, 0)}
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
                          홀별 PAR (총: {course.holePars.reduce((sum, par) => sum + par, 0)})
                        </div>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(9, 1fr)', 
                          gap: '4px',
                          fontSize: '12px'
                        }}>
                          {course.holePars.map((par, idx) => (
                            <div 
                              key={idx}
                              style={{
                                padding: '4px',
                                background: 'var(--text-light)',
                                borderRadius: '4px',
                                textAlign: 'center',
                                border: '1px solid var(--border-color)'
                              }}
                            >
                              <div style={{ fontSize: '10px', color: 'var(--text-dark)', opacity: 0.7 }}>{idx + 1}</div>
                              <div style={{ fontWeight: '600' }}>{par}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
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
                {members.filter(m => m.isActive).map(member => (
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

            <div className="card" style={{ background: 'var(--bg-green)', border: 'none' }}>
              <div style={{ fontSize: '14px', color: 'var(--text-dark)', opacity: 0.7, textAlign: 'center' }}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>3355 골프 클럽</div>
                <div>버전 1.0.0</div>
              </div>
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
                <select
                  value={scoreFormData.courseName}
                  onChange={(e) => setScoreFormData({ ...scoreFormData, courseName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    fontSize: '14px',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="">골프장 선택</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </select>
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
                      return selectedMembers.length === participantMembers.length && 
                             participantMembers.every(m => selectedMembers.includes(m.id)) &&
                             participantMembers.length > 0;
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
                      const selectedParticipants = participantMembers.filter(m => selectedMembers.includes(m.id));
                      return `${selectedParticipants.length} / ${participantMembers.length}`;
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
    </div>
  );
}

export default Admin;
