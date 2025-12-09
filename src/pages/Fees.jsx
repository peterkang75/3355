import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "../contexts/AppContext";
import CrownIcon from "../components/CrownIcon";
import apiService from "../services/api";
import { Card, Button, PageHeader, ProfileBadge } from "../components/common";

function Fees() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, members, userTransactions, bookings } = useApp();

  // 상태 관리
  const [activeTab, setActiveTab] = useState("personal");
  const [allTransactions, setAllTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1); // 전체 페이지 수

  // 모달 및 기타 기능 상태
  const [showReceiptModal, setShowReceiptModal] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [clubBalance, setClubBalance] = useState(0);
  const [outstandingCount, setOutstandingCount] = useState(0);
  const [paymentGuideText, setPaymentGuideText] = useState("");

  // 수정/삭제 관련 상태
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

  // 크레딧 액션 상태
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
      loadLedgerData(1); // 탭 전환 시 1페이지부터 로드
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

  // 통합 장부 데이터 로드 (핵심 최적화 부분)
  const loadLedgerData = async (page) => {
    try {
      setLoading(true);

      const [transactionsResponse, balanceData, outstandingData] =
        await Promise.all([
          apiService.fetchTransactions({ page, limit: ITEMS_PER_PAGE }),
          apiService.fetchClubBalance(),
          apiService.fetchOutstandingBalances(),
        ]);

      // API 응답 구조 처리 ({ transactions: [], pagination: {} })
      const transactionsData = transactionsResponse.transactions || [];
      const pagination = transactionsResponse.pagination || { totalPages: 1 };

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

  // 영수증 보기 핸들러 (이미지 없을 시 서버 요청)
  const handleViewReceipt = async (transaction) => {
    // 이미 이미지가 로드된 경우 바로 표시
    if (transaction.receiptImages?.length > 0 || transaction.receiptImage) {
      if (transaction.receiptImages?.length > 0) {
        setGalleryImages(transaction.receiptImages);
        setGalleryIndex(0);
      } else {
        setShowReceiptModal(transaction.receiptImage);
      }
      return;
    }

    // 상세 정보(이미지) 서버 요청
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

  // ... (기존 수정/삭제/업로드 핸들러들은 그대로 유지) ...
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
    // 수정 모달 열 때도 상세 이미지는 별도 로딩
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

  // 개인 잔액 계산 로직 (기존 유지)
  const totalCharges = userTransactions
    .filter((t) => t.type === "charge")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPayments = userTransactions
    .filter((t) => t.type === "payment" && t.category !== "크레딧 자동 납부")
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

  // 크레딧 액션 핸들러 (기존 유지)
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

  // 헬퍼 함수
  const getTransactionLabel = (t) => {
    if (t.type === "creditDonation") return "도네이션 (크레딧)";
    if (t.type === "donation") return t.category || "도네이션";
    if (t.type === "credit") return t.description || "크레딧";
    if (t.type === "expense") return t.category || t.description || "지출";
    if (t.type === "charge") return "청구";
    if (t.type === "payment") return t.description?.split(" - ")[0] || "납부";
    return "";
  };

  const getTransactionColor = (t) => {
    if (["charge", "expense", "creditDonation"].includes(t.type))
      return "var(--alert-red)";
    return "var(--success-green)";
  };

  const getTransactionSign = (t) => {
    if (["charge", "expense", "creditDonation"].includes(t.type)) return "-";
    return "+";
  };

  // UI 렌더링
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
              {/* ... (나머지 개인 내역 UI는 기존과 동일하게 유지하거나 간소화) ... */}
            </div>

            {/* 크레딧 활용 카드 */}
            <div
              className="card"
              style={{ background: "#f8f9fa", border: "1px solid #dee2e6" }}
            >
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "700",
                  marginBottom: "12px",
                  color: "#495057",
                }}
              >
                💳 크레딧 활용
              </h3>
              <div style={{ display: "flex", gap: "12px" }}>
                <div
                  style={{
                    flex: 1,
                    background: creditBalance > 0 ? "#d4edda" : "#fff",
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
                      color: "#28a745",
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
              {/* 크레딧 버튼들 */}
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
                      background: "#17a2b8",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  >
                    🎁 기부
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

            {/* 개인 거래 내역 리스트 */}
            <div className="card">
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  marginBottom: "16px",
                  color: "var(--primary-green)",
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
                      !(t.type === "donation" && t.category === "도네이션"),
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
                  {allTransactions.map((transaction) => {
                    // 라운딩명 표시 로직
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
                            {/* 멤버 이름 */}
                            {transaction.member && (
                              <span
                                style={{ fontSize: "13px", fontWeight: "600" }}
                              >
                                {transaction.member.name}
                              </span>
                            )}
                            {/* 이미지 아이콘 */}
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
                                color: "var(--primary-green)",
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
                              color: getTransactionColor(transaction),
                            }}
                          >
                            {getTransactionSign(transaction)}$
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

                  {/* 페이지네이션 컨트롤 */}
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

      {/* 영수증 모달, 편집 모달, 크레딧 모달 등은 기존 코드 그대로 둡니다 (공간상 생략했으나 복붙 시엔 기존 return문 아래쪽 모달 코드들 다 포함되어야 합니다. 위 코드는 핵심 로직 교체용입니다.) */}
      {/* (주의: 위 return문 안에 모달 컴포넌트 JSX들이 포함되어야 완벽합니다. 제공해주신 코드의 모달 부분은 변경할 필요가 없으므로, 위 렌더링 로직만 덮어쓰셔도 되고, 불안하시면 아래 전체 모달 코드를 포함한 풀버전을 요청주세요.) */}

      {/* ... (showReceiptModal, editingTransaction, showCreditModal 관련 JSX 코드는 기존과 동일하게 유지) ... */}
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

      {/* 갤러리 모달 등 나머지 모달 코드들도 여기에... */}
      {/* (편의를 위해 위 로직을 기존 Fees 컴포넌트의 return 문 내부 내용으로 교체하는 것을 추천합니다) */}
    </div>
  );
}

export default Fees;
