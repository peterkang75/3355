import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import CrownIcon from "../components/CrownIcon";
import apiService from "../services/api";
import { Card, PageHeader, ProfileBadge } from "../components/common";

function Fees() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userTransactions } = useApp();

  // --- 상태 관리 ---
  const [activeTab, setActiveTab] = useState("personal");
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // --- 모달 및 데이터 상태 ---
  const [showReceiptModal, setShowReceiptModal] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [clubBalance, setClubBalance] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [paymentGuideText, setPaymentGuideText] = useState("");

  // --- 수정/삭제 상태 ---
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [editFormData, setEditFormData] = useState({
    amount: "",
    date: "",
    description: "",
    category: "",
    memo: "",
    bookingId: "",
    receiptImage: "",
    receiptImages: [],
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // --- 크레딧 액션 상태 ---
  const [showCreditModal, setShowCreditModal] = useState(null);
  const [creditActionAmount, setCreditActionAmount] = useState("");
  const [creditActionMemo, setCreditActionMemo] = useState("");
  const [creditActionLoading, setCreditActionLoading] = useState(false);
  const [selectedChargeId, setSelectedChargeId] = useState(null);

  const ITEMS_PER_PAGE = 20;

  const canManageFees =
    user?.isAdmin ||
    user?.canManageFees ||
    ["관리자", "방장", "운영진", "클럽운영진"].includes(user?.role);

  useEffect(() => {
    if (location.state?.reset) {
      setActiveTab("personal");
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  useEffect(() => {
    loadPaymentGuide();
  }, []);

  // 탭 변경 시 데이터 로드
  useEffect(() => {
    if (activeTab === "personal") {
      setLoading(false);
    } else {
      loadLedgerData(1);
    }
  }, [user.id, activeTab]);

  const loadPaymentGuide = async () => {
    try {
      const settings = await apiService.fetchSettings();
      const guideSetting = settings.find(
        (s) => s.feature === "paymentGuideText",
      );
      if (guideSetting && guideSetting.value)
        setPaymentGuideText(guideSetting.value);
    } catch (error) {
      console.error("납부안내 로드 실패:", error);
    }
  };

  // --- 통합 장부 데이터 로드 (핵심 최적화) ---
  const loadLedgerData = async (page) => {
    try {
      setLoading(true);

      const [transactionsResponse, balanceData, outstandingData] =
        await Promise.all([
          apiService.fetchTransactions({ page, limit: ITEMS_PER_PAGE }),
          apiService.fetchClubBalance(),
          apiService.fetchOutstandingBalances(),
        ]);

      // API 응답 처리 (배열/객체 호환)
      const transactionsData = Array.isArray(transactionsResponse)
        ? transactionsResponse
        : transactionsResponse.transactions || [];

      const pagination = transactionsResponse.pagination || { totalPages: 1 };

      console.log('📊 Fees 장부 로드:', {
        받은거래수: transactionsData.length,
        페이지: page,
        총페이지: pagination.totalPages,
        총거래수: pagination.total
      });

      setAllTransactions(transactionsData);
      setTotalPages(pagination.totalPages);
      setCurrentPage(page);

      setClubBalance(balanceData?.balance || 0);
      setOutstandingCount(outstandingData?.length || 0);
    } catch (error) {
      console.error("장부 데이터 로드 실패:", error);
      setAllTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // --- 영수증 보기 (On-Demand Loading) ---
  const handleViewReceipt = async (transaction) => {
    // 이미지가 이미 있으면 바로 표시
    if (transaction.receiptImages?.length > 0) {
      setGalleryImages(transaction.receiptImages);
      setGalleryIndex(0);
      return;
    }
    if (transaction.receiptImage) {
      setShowReceiptModal(transaction.receiptImage);
      return;
    }

    // 없으면 서버에서 상세 조회
    try {
      const details = await apiService.fetchTransactionDetails(transaction.id);
      if (details.receiptImages?.length > 0) {
        setGalleryImages(details.receiptImages);
        setGalleryIndex(0);
      } else if (details.receiptImage) {
        setShowReceiptModal(details.receiptImage);
      } else {
        alert("등록된 영수증 이미지가 없습니다.");
      }
    } catch (e) {
      console.error("영수증 로드 실패", e);
      alert("영수증을 불러오는데 실패했습니다.");
    }
  };

  // --- 모달 핸들러 ---
  const handleOpenEditModal = async (transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.amount.toString(),
      date:
        transaction.date ||
        new Date(transaction.createdAt).toISOString().split("T")[0],
      description: transaction.description || "",
      category: transaction.category || "",
      memo: transaction.memo || "",
      bookingId: transaction.bookingId || "",
      receiptImage: "",
      receiptImages: [],
    });
    try {
      const details = await apiService.fetchTransactionDetails(transaction.id);
      setEditFormData((prev) => ({
        ...prev,
        receiptImage: details?.receiptImage || "",
        receiptImages: details?.receiptImages || [],
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
    setEditFormData({
      amount: "",
      date: "",
      description: "",
      category: "",
      memo: "",
      bookingId: "",
      receiptImage: "",
      receiptImages: [],
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("이미지 크기는 5MB 이하여야 합니다.");
      return;
    }
    setImageUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (editingTransaction?.type === "expense") {
          setEditFormData((prev) => ({
            ...prev,
            receiptImages: [...prev.receiptImages, reader.result],
          }));
        } else {
          setEditFormData((prev) => ({ ...prev, receiptImage: reader.result }));
        }
        setImageUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("업로드 실패:", error);
      setImageUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    if (editingTransaction?.type === "expense" && typeof index === "number") {
      setEditFormData((prev) => ({
        ...prev,
        receiptImages: prev.receiptImages.filter((_, i) => i !== index),
      }));
    } else {
      setEditFormData((prev) => ({ ...prev, receiptImage: "" }));
    }
  };

  const handleUpdateTransaction = async () => {
    if (!editingTransaction) return;
    setIsUpdating(true);
    try {
      const updateData = {
        amount: parseFloat(editFormData.amount),
        date: editFormData.date,
        description: editFormData.description,
        bookingId: editFormData.bookingId || null,
      };
      if (editingTransaction.type === "expense") {
        updateData.category = editFormData.category || null;
        updateData.memo = editFormData.memo || null;
        updateData.receiptImages = editFormData.receiptImages;
      } else {
        updateData.receiptImage = editFormData.receiptImage || null;
      }
      await apiService.updateTransaction(editingTransaction.id, updateData);
      await loadLedgerData(currentPage);
      handleCloseEditModal();
      alert("수정되었습니다.");
    } catch (error) {
      alert("수정 실패");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!editingTransaction || !window.confirm("삭제하시겠습니까?")) return;
    setIsDeleting(true);
    try {
      await apiService.deleteTransaction(editingTransaction.id);
      await loadLedgerData(currentPage);
      handleCloseEditModal();
      alert("삭제되었습니다.");
    } catch (error) {
      alert("삭제 실패");
    } finally {
      setIsDeleting(false);
    }
  };

  // --- 개인 잔액 계산 ---
  const totalCharges = userTransactions
    .filter((t) => t.type === "charge")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = userTransactions
    .filter((t) => t.type === "payment" && t.category !== "크레딧 자동 납부" && t.category !== "크레딧 자동 차감")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCredits = userTransactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = userTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalCreditDonations = userTransactions
    .filter((t) => t.type === "creditDonation")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance =
    totalPayments +
    totalCredits -
    totalCharges -
    totalExpenses -
    totalCreditDonations;
  const actualUnpaid = Math.max(0, -balance);
  const creditBalance = balance > 0 ? balance : 0;

  // --- 크레딧 액션 ---
  const handleCreditToDonation = async () => {
    if (creditActionLoading) return;
    const amount = parseFloat(creditActionAmount);
    if (!amount || amount <= 0 || amount > creditBalance)
      return alert("금액을 확인해주세요.");
    setCreditActionLoading(true);
    try {
      await apiService.creditToDonation(user.id, amount, creditActionMemo);
      alert("도네이션 완료");
      setShowCreditModal(null);
      setCreditActionAmount("");
    } catch (e) {
      alert("실패");
    } finally {
      setCreditActionLoading(false);
    }
  };

  const handleCreditToPayment = async () => {
    if (creditActionLoading) return;
    const amount = parseFloat(creditActionAmount);
    if (
      !amount ||
      amount <= 0 ||
      amount > creditBalance ||
      amount > actualUnpaid
    )
      return alert("금액을 확인해주세요.");
    setCreditActionLoading(true);
    try {
      await apiService.creditToPayment(
        user.id,
        amount,
        selectedChargeId,
        creditActionMemo,
      );
      alert("납부 완료");
      setShowCreditModal(null);
      setCreditActionAmount("");
    } catch (e) {
      alert("실패");
    } finally {
      setCreditActionLoading(false);
    }
  };

  // --- UI 헬퍼 ---
  const getTransactionLabel = (t) => {
    if (t.type === "creditDonation") return "도네이션 (크레딧)";
    if (t.type === "donation") return t.category || "도네이션";
    if (t.type === "credit") return t.description || "크레딧";
    if (t.type === "expense") {
      if (t.category === "크레딧 자동 차감" && t.description) {
        const itemName = t.description.split(" (크레딧")[0];
        return `${itemName}(크레딧차감)`;
      }
      return t.category || t.description || "지출";
    }
    if (t.type === "charge") return "청구";
    if (t.type === "payment") return t.description?.split(" - ")[0] || "납부";
    return "";
  };

  const getTransactionColor = (t) => {
    if (["charge", "expense", "creditDonation"].includes(t.type))
      return "#DC2626"; // Red
    return "#1A3D2F"; // Green/Primary
  };

  const getTransactionSign = (t) => {
    if (["charge", "expense", "creditDonation"].includes(t.type)) return "-";
    return "+";
  };

  // --- 렌더링 ---
  return (
    <div>
      <PageHeader
        title="회비 관리"
        rightContent={<ProfileBadge user={user} showGreeting={true} />}
      />

      <div className="page-content">
        {/* 탭 버튼 */}
        <div
          style={{
            display: "flex",
            background: "#E5E7EB",
            borderRadius: "12px",
            padding: "4px",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => setActiveTab("personal")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "personal" ? "#FFF" : "transparent",
              fontWeight: activeTab === "personal" ? "800" : "600",
              color: activeTab === "personal" ? "#1A3D2F" : "#6B7280",
              cursor: "pointer",
            }}
          >
            개인 참가비 내역
          </button>
          <button
            onClick={() => setActiveTab("club")}
            style={{
              flex: 1,
              padding: "10px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "club" ? "#FFF" : "transparent",
              fontWeight: activeTab === "club" ? "800" : "600",
              color: activeTab === "club" ? "#1E40AF" : "#6B7280",
              cursor: "pointer",
            }}
          >
            클럽 회계장부
          </button>
        </div>

        {activeTab === "personal" ? (
          <>
            {/* 개인 잔액 카드 */}
            <div
              className="card"
              style={{
                background: "#FFFFFF",
                borderLeft: "8px solid #E59879",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  color: "#666",
                  fontWeight: "600",
                  marginBottom: "4px",
                }}
              >
                현재 잔액
              </div>
              <div
                style={{
                  fontSize: "40px",
                  fontWeight: "800",
                  marginBottom: "16px",
                  color: balance >= 0 ? "#E59879" : "#DC2626",
                }}
              >
                ${balance.toLocaleString()}
              </div>
            </div>

            {/* 크레딧 카드 */}
            <div
              className="card"
              style={{ background: "#f8f9fa", border: "1px solid #dee2e6" }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  marginBottom: "8px",
                  color: "#495057",
                }}
              >
                💳 크레딧 활용
              </h3>
              <p
                style={{
                  fontSize: "12px",
                  color: "#6B7280",
                  marginBottom: "12px",
                  lineHeight: "1.4",
                }}
              >
                클럽에서 청구되는 금액은 현재 보유 잔액에서 자동 차감됩니다.
              </p>
              <div style={{ display: "flex", gap: "12px" }}>
                <div
                  style={{
                    flex: 1,
                    background: "#F5F7F7",
                    padding: "10px",
                    textAlign: "center",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#666" }}>
                    사용 가능
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#E59879",
                    }}
                  >
                    ${creditBalance.toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: actualUnpaid > 0 ? "#f8d7da" : "#fff",
                    padding: "10px",
                    textAlign: "center",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#666" }}>
                    미납 금액
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: "700",
                      color: "#dc3545",
                    }}
                  >
                    ${actualUnpaid.toLocaleString()}
                  </div>
                </div>
              </div>
              {creditBalance > 0 && (
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                  <button
                    onClick={() => {
                      setShowCreditModal("donation");
                      setCreditActionAmount(creditBalance.toString());
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#1A3D2F",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    🎁 클럽에 기부하기
                  </button>
                  {actualUnpaid > 0 && (
                    <button
                      onClick={() => {
                        setShowCreditModal("payment");
                        setCreditActionAmount(
                          Math.min(creditBalance, actualUnpaid).toString(),
                        );
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                      }}
                    >
                      💰 납부
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 개인 거래 리스트 */}
            <div className="card">
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  color: "#1A3D2F",
                }}
              >
                거래 내역
              </h3>
              {userTransactions.length === 0 ? (
                <div
                  style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}
                >
                  내역이 없습니다.
                </div>
              ) : (
                userTransactions
                  .filter(
                    (t) =>
                      !(t.type === "donation" && t.category === "도네이션") &&
                      !(t.type === "payment" && t.category === "크레딧 자동 차감"),
                  )
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "14px 0",
                        borderBottom: "1px solid #eee",
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: "600" }}>
                          {getTransactionLabel(t)}
                        </div>
                        <div style={{ fontSize: "12px", color: "#888" }}>
                          {new Date(t.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div
                        style={{
                          fontWeight: "700",
                          color: getTransactionColor(t),
                        }}
                      >
                        {getTransactionSign(t)}${t.amount.toLocaleString()}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </>
        ) : (
          <>
            {/* 클럽 회계 장부 탭 */}
            <div
              className="card"
              style={{
                background: "#FFFFFF",
                borderLeft: "8px solid #1E3A8A",
                padding: "24px",
                marginBottom: "16px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#1E40AF",
                    marginBottom: "6px",
                    fontWeight: "600",
                  }}
                >
                  클럽 잔액
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#1E3A8A",
                  }}
                >
                  $
                  {clubBalance.toLocaleString(undefined, {
                    minimumFractionDigits: 1,
                  })}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#1E40AF",
                    marginBottom: "6px",
                    fontWeight: "600",
                  }}
                >
                  미수금 회원
                </div>
                <div
                  style={{
                    fontSize: "32px",
                    fontWeight: "800",
                    color: "#1E3A8A",
                  }}
                >
                  {outstandingCount}명
                </div>
              </div>
            </div>

            <div className="card">
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  color: "var(--primary-green)",
                }}
              >
                최근 거래내역
              </h3>

              {loading ? (
                <div style={{ padding: "40px", textAlign: "center" }}>
                  로딩 중...
                </div>
              ) : allTransactions.length === 0 ? (
                <div
                  style={{ padding: "40px", textAlign: "center", opacity: 0.7 }}
                >
                  <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                    📖
                  </div>
                  <p>거래내역이 없습니다</p>
                </div>
              ) : (
                <div>
                  {allTransactions
                    .filter((t) => t.type !== "creditDonation")
                    .filter((t) => !(t.type === "expense" && (t.category === "크레딧 자동 차감" || t.category === "크레딧 납부")))
                    .map((transaction) => {
                    const roundingName = transaction.booking
                      ? `${transaction.booking.courseName} (${new Date(transaction.booking.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })})`
                      : null;

                    return (
                      <div
                        key={transaction.id}
                        onClick={() => handleViewReceipt(transaction)}
                        style={{
                          padding: "14px 12px",
                          borderBottom: "1px solid #eee",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: getTransactionColor(transaction),
                                color: "white",
                              }}
                            >
                              {getTransactionLabel(transaction)}
                            </span>
                            {transaction.member && (
                              <span
                                style={{ fontSize: "13px", fontWeight: "600" }}
                              >
                                {transaction.member.nickname || transaction.member.name}
                              </span>
                            )}
                            <span style={{ fontSize: "12px" }}>
                              {transaction.receiptImage ||
                              transaction.receiptImages
                                ? "📎"
                                : ""}
                            </span>
                          </div>
                          {roundingName && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#1A3D2F",
                                fontWeight: "600",
                              }}
                            >
                              ⛳ {roundingName}
                            </div>
                          )}
                          <div style={{ fontSize: "12px", color: "#888" }}>
                            {new Date(transaction.date).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontSize: "16px",
                              fontWeight: "700",
                              color: transaction.type === "credit" ? "#DC2626" : getTransactionColor(transaction),
                            }}
                          >
                            {transaction.type === "credit" ? "-" : getTransactionSign(transaction)}$
                            {transaction.amount.toLocaleString()}
                          </div>
                          {canManageFees && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(transaction);
                              }}
                              style={{
                                marginTop: "4px",
                                padding: "4px 8px",
                                fontSize: "11px",
                                background: "#eee",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              수정
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* 페이지네이션 */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "12px",
                        marginTop: "20px",
                      }}
                    >
                      <button
                        onClick={() => loadLedgerData(currentPage - 1)}
                        disabled={currentPage <= 1}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #ddd",
                          background: "white",
                          borderRadius: "6px",
                          cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                        }}
                      >
                        이전
                      </button>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontWeight: "600",
                        }}
                      >
                        {currentPage} / {totalPages}
                      </span>
                      <button
                        onClick={() => loadLedgerData(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        style={{
                          padding: "8px 16px",
                          border: "1px solid #ddd",
                          background: "white",
                          borderRadius: "6px",
                          cursor:
                            currentPage >= totalPages
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        다음
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {showReceiptModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowReceiptModal(null)}
        >
          <div style={{ maxWidth: "90%", maxHeight: "90%" }}>
            <img
              src={showReceiptModal}
              alt="Receipt"
              style={{ width: "100%", borderRadius: "8px" }}
            />
          </div>
        </div>
      )}

      {galleryImages.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setGalleryImages([]);
            setGalleryIndex(0);
          }}
        >
          <div style={{ maxWidth: "90%", maxHeight: "90%" }}>
            <img
              src={galleryImages[galleryIndex]}
              alt="Receipt"
              style={{ width: "100%", borderRadius: "8px" }}
            />
          </div>
          {/* 갤러리 컨트롤 생략 - 필요시 추가 */}
        </div>
      )}

      {editingTransaction && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "400px",
            }}
          >
            <h3>수정</h3>
            {/* 간단한 수정 폼 예 */}
            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                onClick={handleCloseEditModal}
                style={{ flex: 1, padding: "10px" }}
              >
                취소
              </button>
              <button
                onClick={handleUpdateTransaction}
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#1A3D2F",
                  color: "white",
                }}
              >
                저장
              </button>
            </div>
            <button
              onClick={handleDeleteTransaction}
              style={{
                width: "100%",
                marginTop: "10px",
                padding: "10px",
                background: "#DC2626",
                color: "white",
              }}
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {showCreditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              padding: "20px",
              borderRadius: "12px",
              width: "90%",
              maxWidth: "360px",
            }}
          >
            <h3>크레딧 처리</h3>
            <input
              type="number"
              value={creditActionAmount}
              onChange={(e) => setCreditActionAmount(e.target.value)}
              style={{ width: "100%", padding: "10px", margin: "10px 0" }}
              placeholder="금액"
            />
            <input
              type="text"
              value={creditActionMemo}
              onChange={(e) => setCreditActionMemo(e.target.value)}
              style={{ width: "100%", padding: "10px", margin: "10px 0" }}
              placeholder="메모"
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setShowCreditModal(null)}
                style={{ flex: 1, padding: "10px" }}
              >
                취소
              </button>
              <button
                onClick={
                  showCreditModal === "donation"
                    ? handleCreditToDonation
                    : handleCreditToPayment
                }
                style={{
                  flex: 1,
                  padding: "10px",
                  background: "#1A3D2F",
                  color: "white",
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Fees;
