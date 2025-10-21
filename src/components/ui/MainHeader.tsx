import React, { useState, useEffect, useMemo } from "react";
import { Save, AlertCircle } from "lucide-react";
import { useProjectStore } from "../../stores";
import { useBlockStore } from "../../stores/blockStore";
import { useAuth } from "../../stores/authStore";
import { useNavigate } from "react-router-dom";

const MainHeader: React.FC<{
  onSaveProject: () => void;
}> = ({ onSaveProject }) => {
  const { userName, userImage } = useAuth();
  const navigate = useNavigate();

  const projectId = useProjectStore((state) => state.projectId);
  const projectName = useProjectStore((state) => state.projectName);
  const description = useProjectStore((state) => state.description);
  const currentCSP = useProjectStore((state) => state.currentCSP);

  const setProjectName = useProjectStore((state) => state.setProjectName);
  const setCurrentCSP = useProjectStore((state) => state.setCurrentCSP);

  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(projectName);

  useEffect(() => {
    setTempName(projectName);
  }, [projectName]);

  const handleNameSubmit = async () => {
    const trimmed = tempName.trim();
    setEditingName(false); // 먼저 편집 모드 종료

    // 이름이 변경되지 않았거나 빈 문자열이면 무시
    if (!trimmed || trimmed === projectName || !projectId) return;

    // UI 상 즉시 업데이트 (optimistic update)
    setProjectName(trimmed);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
        body: JSON.stringify({
          name: trimmed,
          description,
        }),
      });

      if (!response.ok) {
        throw new Error(`(${response.status}) 서버 응답 오류`);
      }

      // 필요 시 서버 응답에서 name을 다시 읽어 동기화 가능
    } catch (err: any) {
      alert("❌ 제목 저장 실패: " + err.message);
      setTempName(projectName); // 실패 시 원래 이름으로 복구
    }
  };

  // 블록 스토어에서 드롭된 블록과 블록 수를 가져오기
  const droppedBlocks = useBlockStore((state) => state.droppedBlocks);
  // 블록 카운트를 별도로 추적하여 변화를 더 명확하게 감지
  const blockCount = useBlockStore((state) => state.droppedBlocks.length);

  // 캔버스에 배치된 블록이 있는지 확인
  const hasBlocks = blockCount > 0;

  // 디버깅을 위한 useEffect - 블록 변경 시 로그 출력 및 UI 업데이트 강제
  const [lastBlockCount, setLastBlockCount] = useState(blockCount);

  useEffect(() => {
    console.log(`🔄 [MainHeader] Blocks changed: ${blockCount} blocks in canvas`);

    // 블록 수가 변경되면 상태 업데이트
    if (blockCount !== lastBlockCount) {
      setLastBlockCount(blockCount);

      // 강제로 상태 업데이트를 트리거하여 재렌더링
      if (blockCount === 0) {
        // 모든 블록이 제거된 경우 - CSP 변경 가능
        console.log(`🧹 [MainHeader] All blocks removed, CSP change now enabled`);
      } else if (lastBlockCount === 0 && blockCount > 0) {
        // 첫 블록이 추가된 경우 - CSP 변경 제한
        console.log(`🔒 [MainHeader] First block added, CSP change now restricted`);
      }
    }
  }, [blockCount, lastBlockCount]);

  // 블록 타입이 어떤 CSP에 속하는지 확인하는 함수들
  const isAwsBlock = (type: string) => type.startsWith('aws-') ||
    ['vpc', 'subnet', 'ec2', 'ebs', 'security-group', 'load-balancer'].includes(type);

  const isGcpBlock = (type: string) => type.startsWith('gcp-') ||
    ['vpc-network', 'subnet', 'compute-engine', 'persistent-disk', 'firewall'].includes(type);

  const isAzureBlock = (type: string) => type.startsWith('azure-') ||
    ['virtual-network', 'subnet', 'virtual-machine', 'managed-disk', 'nsg'].includes(type);

  // 블록의 CSP 분포 계산
  const blockDistribution = useMemo(() => {
    const hasAwsBlocks = droppedBlocks.some(block => isAwsBlock(block.type));
    const hasGcpBlocks = droppedBlocks.some(block => isGcpBlock(block.type));
    const hasAzureBlocks = droppedBlocks.some(block => isAzureBlock(block.type));

    return { hasAwsBlocks, hasGcpBlocks, hasAzureBlocks };
  }, [droppedBlocks]);

  // 현재 배치된 블록의 CSP 확인
  const canChangeCSP = useMemo(() => {
    // 블록이 없으면 변경 가능
    if (!hasBlocks) return true;

    console.log(`🔍 [MainHeader] Checking if CSP can be changed with ${blockCount} blocks`);

    const { hasAwsBlocks, hasGcpBlocks, hasAzureBlocks } = blockDistribution;

    console.log(`🧩 [MainHeader] Block types: AWS=${hasAwsBlocks}, GCP=${hasGcpBlocks}, Azure=${hasAzureBlocks}`);

    // 여러 CSP의 블록이 혼합되어 있으면 변경 불가
    const mixedCSPs = [hasAwsBlocks, hasGcpBlocks, hasAzureBlocks].filter(Boolean).length > 1;
    if (mixedCSPs) return false;

    // 현재 CSP와 블록의 CSP가 일치하는지 확인
    if (hasAwsBlocks && currentCSP !== 'AWS') return false;
    if (hasGcpBlocks && currentCSP !== 'GCP') return false;
    if (hasAzureBlocks && currentCSP !== 'Azure') return false;

    return true;
  }, [blockDistribution, blockCount, currentCSP, hasBlocks]);

  // 다른 CSP로 변경 시도 처리
  const [showWarning, setShowWarning] = useState(false);

  const handleCSPChange = (csp: "AWS" | "GCP" | "Azure") => {
    console.log(`🔄 [MainHeader] Trying to change CSP from ${currentCSP} to ${csp}`);
    console.log(`📊 [MainHeader] Current state: hasBlocks=${hasBlocks}, canChangeCSP=${canChangeCSP}, blockCount=${blockCount}`);

    // 이미 같은 CSP면 아무 동작 안함
    if (csp === currentCSP) return;

    // 블록이 있는 경우, 직접 검사
    if (blockCount > 0) {
      // 블록이 있을 때는 현재 블록의 CSP와 선택한 CSP가 일치해야 함
      const { hasAwsBlocks, hasGcpBlocks, hasAzureBlocks } = blockDistribution;

      // 해당 CSP가 아닌데 다른 CSP의 블록이 있으면 변경 불가
      if ((csp === "AWS" && (hasGcpBlocks || hasAzureBlocks)) ||
        (csp === "GCP" && (hasAwsBlocks || hasAzureBlocks)) ||
        (csp === "Azure" && (hasAwsBlocks || hasGcpBlocks))) {
        console.log(`⚠️ [MainHeader] Cannot change CSP: incompatible blocks exist`);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000); // 3초 후 경고 사라짐
        return;
      }

      // 선택한 CSP와 현재 블록의 CSP가 일치하지 않으면 변경 불가
      if ((csp === "AWS" && !hasAwsBlocks) ||
        (csp === "GCP" && !hasGcpBlocks) ||
        (csp === "Azure" && !hasAzureBlocks)) {
        // 이 경우는 버튼 자체가 비활성화되어 있어야 하지만, 안전을 위한 추가 검사
        console.log(`⚠️ [MainHeader] Cannot change CSP: blocks don't match selected CSP`);
        setShowWarning(true);
        setTimeout(() => setShowWarning(false), 3000);
        return;
      }
    }

    // CSP 변경 가능한 경우
    console.log(`✅ [MainHeader] Changing CSP to ${csp}`);
    setCurrentCSP(csp);
  };

  return (
    <header className="w-full bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex items-center justify-between z-50">
      {/* 좌측: 로고 + 이름 + CSP */}
      <div className="flex items-center space-x-4">
        <img
          src="/BlockCloud-logo.png"
          alt="BlockCloud logo"
          className="w-10 h-10"
        />

        {/* 프로젝트 이름 */}
        {editingName ? (
          <input
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
            autoFocus
            className="text-lg font-bold text-gray-800 border-b border-gray-300 focus:outline-none px-1 bg-white"
          />
        ) : (
          <h1
            className="text-lg font-bold text-gray-800 cursor-pointer"
            onClick={() => setEditingName(true)}
          >
            {projectName}
          </h1>
        )}

        {/* CSP 선택 - 버튼으로 대체하여 더 나은 제어 */}
        <div className="relative">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
            <button
              onClick={() => handleCSPChange("AWS")}
              disabled={blockCount > 0 && (currentCSP !== "AWS")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition
                ${currentCSP === "AWS"
                  ? "bg-blue-600 text-white"
                  : blockCount > 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              title={blockCount > 0 && currentCSP !== "AWS" ? "이미 다른 프로바이더의 블록이 있습니다" : "AWS 선택"}
            >
              AWS
            </button>
            <button
              onClick={() => handleCSPChange("GCP")}
              disabled={blockCount > 0 && (currentCSP !== "GCP")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition
                ${currentCSP === "GCP"
                  ? "bg-blue-600 text-white"
                  : blockCount > 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              title={blockCount > 0 && currentCSP !== "GCP" ? "이미 다른 프로바이더의 블록이 있습니다" : "GCP 선택"}
            >
              GCP
            </button>
            <button
              onClick={() => handleCSPChange("Azure")}
              disabled={blockCount > 0 && (currentCSP !== "Azure")}
              className={`px-2 py-1 text-xs font-medium rounded-md transition
                ${currentCSP === "Azure"
                  ? "bg-blue-600 text-white"
                  : blockCount > 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                }`}
              title={blockCount > 0 && currentCSP !== "Azure" ? "이미 다른 프로바이더의 블록이 있습니다" : "Azure 선택"}
            >
              Azure
            </button>
          </div>

          {showWarning && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-600 flex items-center z-50 shadow-md">
              <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
              <span>이미 배치된 블록이 있어 CSP를 변경할 수 없습니다.</span>
            </div>
          )}

        </div>
      </div>

      {/* 우측: 버튼 + 사용자 */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-100 hover:bg-blue-200 text-blue-700"
          >
            목록으로 이동
          </button>
          <button
            onClick={onSaveProject}
            className="flex items-center text-sm px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <Save className="w-4 h-4 mr-1" />
            프로젝트 저장
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <img
            src={userImage}
            alt="user"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="text-sm text-gray-700">{userName}</span>
        </div>
      </div>
    </header>
  );
};

export default MainHeader;
