import type { CloudBlock } from '../../../core/types/common';
import type { Connection } from '../../../types/blocks';

/**
 * GCP Terraform 코드 생성기
 * Google Cloud Platform 리소스에 대한 Terraform 코드 생성
 */
export class GCPTerraformGenerator {
  /**
   * GCP Terraform 코드 생성
   */
  static generateCode(blocks: CloudBlock[], connections: Connection[] = []): string {
    console.log("🔧 [GCPTerraformGenerator] Starting GCP Terraform code generation");
    console.log("🔧 [GCPTerraformGenerator] Blocks:", blocks.length);
    console.log("🔧 [GCPTerraformGenerator] Connections:", connections.length);

    if (!blocks.length) {
      return this.generateEmptyTemplate();
    }

    let code = this.generateHeader(blocks, connections);

    // VPC Network 먼저 생성
    const vpcNetworks = blocks.filter((block) => block.type === "gcp-vpc-network");
    vpcNetworks.forEach((vpc) => {
      code += this.generateVPCNetworkCode(vpc);
    });

    // Subnet 생성
    const subnets = blocks.filter((block) => block.type === "gcp-subnet");
    subnets.forEach((subnet) => {
      code += this.generateSubnetCode(subnet, vpcNetworks);
    });

    // Firewall Rules 생성
    const firewallRules = blocks.filter((block) => block.type === "gcp-firewall-rule");
    firewallRules.forEach((fw) => {
      code += this.generateFirewallRuleCode(fw, vpcNetworks);
    });

    // Persistent Disks 생성 (부트디스크로 사용되지 않는 것만)
    const persistentDisks = blocks.filter((block) => block.type === "gcp-persistent-disk");
    const computeEngines = blocks.filter((block) => block.type === "gcp-compute-engine");

    persistentDisks.forEach((disk) => {
      // 이 Disk가 부트디스크로 사용되는지 확인
      const isBootDisk = connections.some(conn => {
        const isDiskConnection = (
          (conn.fromBlockId === disk.id || conn.toBlockId === disk.id) &&
          computeEngines.some(vm => vm.id === conn.fromBlockId || vm.id === conn.toBlockId)
        );
        return isDiskConnection &&
          conn.properties?.stackConnection === true &&
          conn.properties?.volumeType === 'boot';
      });

      // 부트디스크가 아닌 경우만 별도 리소스 생성
      if (!isBootDisk) {
        code += this.generatePersistentDiskCode(disk);
      }
    });

    // Compute Engine 인스턴스 생성
    computeEngines.forEach((vm) => {
      code += this.generateComputeEngineCode(vm, subnets, persistentDisks, connections);
    });

    // Load Balancers 생성
    const loadBalancers = blocks.filter((block) => block.type === "gcp-load-balancer");
    loadBalancers.forEach((lb) => {
      code += this.generateLoadBalancerCode(lb);
    });

    return code;
  }

  private static generateEmptyTemplate(): string {
    return `# 아직 블록이 없습니다. 
# 팔레트에서 블록을 드래그하여 캔버스에 배치하세요.

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "asia-northeast3"
  zone    = "asia-northeast3-a"
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}
`;
  }

  private static generateHeader(blocks: CloudBlock[], connections: Connection[]): string {
    return `# GCP 인프라 - Terraform 코드
# 마지막 업데이트: ${new Date().toLocaleString()}
# 총 블록 수: ${blocks.length}개
# 총 연결 수: ${connections.length}개

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "asia-northeast3"  # Seoul
  zone    = "asia-northeast3-a"
}

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

`;
  }

  private static generateVPCNetworkCode(vpc: CloudBlock): string {
    const name = vpc.properties.name || vpc.name;
    const routingMode = vpc.properties.routingMode || "GLOBAL";
    const autoCreateSubnetworks = vpc.properties.autoCreateSubnetworks ?? false;
    const description = vpc.properties.description || vpc.description;

    return `# VPC Network: ${name}
resource "google_compute_network" "${this.sanitizeResourceName(vpc.id)}" {
  name                    = "${name}"
  description             = "${description}"
  auto_create_subnetworks = ${autoCreateSubnetworks}
  routing_mode           = "${routingMode}"

  # 기본 라우트 삭제 방지
  delete_default_routes_on_create = false
}

`;
  }

  private static generateSubnetCode(subnet: CloudBlock, vpcNetworks: CloudBlock[]): string {
    const name = subnet.properties.name || subnet.name;
    const ipCidrRange = subnet.properties.ipCidrRange || "10.0.0.0/24";
    const region = subnet.properties.region || "asia-northeast3";
    const privateIpGoogleAccess = subnet.properties.privateIpGoogleAccess ?? true;

    // VPC Network 참조 찾기 (첫 번째 VPC 사용)
    const networkRef = vpcNetworks.length > 0 ?
      `google_compute_network.${this.sanitizeResourceName(vpcNetworks[0].id)}.id` :
      '"default"';

    return `# Subnet: ${name}
resource "google_compute_subnetwork" "${this.sanitizeResourceName(subnet.id)}" {
  name          = "${name}"
  ip_cidr_range = "${ipCidrRange}"
  region        = "${region}"
  network       = ${networkRef}
  
  private_ip_google_access = ${privateIpGoogleAccess}
  
  # 로그 설정 (선택사항)
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling       = 0.5
    metadata           = "INCLUDE_ALL_METADATA"
  }
}

`;
  }

  private static generateFirewallRuleCode(fw: CloudBlock, vpcNetworks: CloudBlock[]): string {
    const name = fw.properties.name || fw.name;
    const direction = fw.properties.direction || "INGRESS";
    const priority = fw.properties.priority || 1000;
    const sourceRanges = fw.properties.sourceRanges || ["0.0.0.0/0"];
    const targetTags = fw.properties.targetTags || [];
    const allowed = fw.properties.allowed || [];

    const networkRef = vpcNetworks.length > 0 ?
      `google_compute_network.${this.sanitizeResourceName(vpcNetworks[0].id)}.id` :
      '"default"';

    let code = `# Firewall Rule: ${name}
resource "google_compute_firewall" "${this.sanitizeResourceName(fw.id)}" {
  name      = "${name}"
  network   = ${networkRef}
  direction = "${direction}"
  priority  = ${priority}

`;

    // Source ranges (INGRESS의 경우)
    if (direction === "INGRESS" && sourceRanges.length > 0) {
      code += `  source_ranges = ${JSON.stringify(sourceRanges)}

`;
    }

    // Target tags
    if (targetTags.length > 0) {
      code += `  target_tags = ${JSON.stringify(targetTags)}

`;
    }

    // Allow rules
    allowed.forEach((rule: any) => {
      code += `  allow {
    protocol = "${rule.protocol}"
`;
      if (rule.ports && rule.ports.length > 0) {
        code += `    ports    = ${JSON.stringify(rule.ports)}
`;
      }
      code += `  }

`;
    });

    code += `}

`;

    return code;
  }

  private static generatePersistentDiskCode(disk: CloudBlock): string {
    const name = disk.properties.name || disk.name;
    const type = disk.properties.type || "pd-standard";
    const size = disk.properties.size || 20;
    const zone = disk.properties.zone || "asia-northeast3-a";

    return `# Persistent Disk: ${name}
resource "google_compute_disk" "${this.sanitizeResourceName(disk.id)}" {
  name = "${name}"
  type = "${type}"
  size = ${size}
  zone = "${zone}"

  labels = {
    environment = "development"
    created_by  = "terraform"
  }
}

`;
  }

  private static generateComputeEngineCode(
    vm: CloudBlock,
    subnets: CloudBlock[],
    persistentDisks: CloudBlock[],
    connections: Connection[]
  ): string {
    const name = vm.properties.name || vm.name;
    const machineType = vm.properties.machineType || "e2-micro";
    const zone = vm.properties.zone || "asia-northeast3-a";
    const networkTags = vm.properties.networkTags || [];

    // VM-Subnet 연결 찾기 (스태킹 관계)
    const subnetConnection = connections.find(conn =>
      (conn.fromBlockId === vm.id || conn.toBlockId === vm.id) &&
      conn.properties?.stackConnection === true &&
      subnets.some(s => s.id === conn.fromBlockId || s.id === conn.toBlockId)
    );

    let subnetRef = '"default"';
    if (subnetConnection) {
      // 연결된 Subnet ID 찾기
      const connectedSubnetId = subnetConnection.fromBlockId === vm.id
        ? subnetConnection.toBlockId
        : subnetConnection.fromBlockId;
      const connectedSubnet = subnets.find(s => s.id === connectedSubnetId);

      if (connectedSubnet) {
        subnetRef = `google_compute_subnetwork.${this.sanitizeResourceName(connectedSubnet.id)}.id`;
        console.log(`[GCP CodeGen] VM ${vm.id.substring(0, 8)} → Subnet ${connectedSubnet.id.substring(0, 8)}`);
      }
    } else if (subnets.length > 0) {
      // 연결이 없으면 첫 번째 Subnet 사용 (fallback)
      subnetRef = `google_compute_subnetwork.${this.sanitizeResourceName(subnets[0].id)}.id`;
      console.warn(`[GCP CodeGen] No subnet connection found for VM ${vm.id.substring(0, 8)}, using first subnet`);
    }

    // 부트디스크 찾기 (스태킹된 Persistent Disk)
    console.log(`[GCP CodeGen] VM ${vm.id.substring(0, 8)} - 부트디스크 검색 중...`);
    console.log(`[GCP CodeGen] 전체 연결 수: ${connections.length}, Disk 수: ${persistentDisks.length}`);

    const bootDisk = persistentDisks.find((disk) => {
      const diskConnection = connections.find(conn =>
        (conn.fromBlockId === vm.id && conn.toBlockId === disk.id) ||
        (conn.fromBlockId === disk.id && conn.toBlockId === vm.id)
      );

      if (diskConnection) {
        console.log(`[GCP CodeGen] Disk ${disk.id.substring(0, 8)} 연결 발견:`, {
          stackConnection: diskConnection.properties?.stackConnection,
          volumeType: diskConnection.properties?.volumeType,
          fromTo: `${diskConnection.fromBlockId.substring(0, 8)} → ${diskConnection.toBlockId.substring(0, 8)}`
        });
      }

      return diskConnection?.properties?.stackConnection === true &&
        diskConnection?.properties?.volumeType === 'boot';
    });

    if (bootDisk) {
      console.log(`✅ [GCP CodeGen] 부트디스크 찾음: ${bootDisk.id.substring(0, 8)} (${bootDisk.properties.name})`);
    } else {
      console.log(`❌ [GCP CodeGen] 부트디스크 없음`);
    }

    let code = `# Compute Engine: ${name}
resource "google_compute_instance" "${this.sanitizeResourceName(vm.id)}" {
  name         = "${name}"
  machine_type = "${machineType}"
  zone         = "${zone}"

`;

    // 부트 디스크 설정
    if (bootDisk) {
      const diskType = bootDisk.properties.type || "pd-standard";
      const diskSize = bootDisk.properties.size || 20;
      code += `  # 부트 디스크 설정 (스태킹: ${bootDisk.properties.name || bootDisk.name})
  boot_disk {
    initialize_params {
      image = "ubuntu-2004-lts"
      size  = ${diskSize}
      type  = "${diskType}"
    }
  }

`;
    } else {
      // 부트디스크가 지정되지 않은 경우 기본값 사용
      code += `  # 부트 디스크 설정 (기본값)
  boot_disk {
    initialize_params {
      image = "ubuntu-2004-lts"
      size  = 20
      type  = "pd-standard"
    }
  }

`;
    }

    // 네트워크 인터페이스
    code += `  # 네트워크 인터페이스
  network_interface {
    subnetwork = ${subnetRef}
    
    # 외부 IP 할당 (개발용)
    access_config {
      # 임시 외부 IP
    }
  }

`;

    // Network tags (firewall rules 적용용)
    if (networkTags.length > 0) {
      code += `  tags = ${JSON.stringify(networkTags)}

`;
    }

    // 메타데이터 설정
    code += `  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update
      apt-get install -y nginx
      systemctl start nginx
      systemctl enable nginx
      echo "<h1>Hello from \${HOSTNAME}</h1>" > /var/www/html/index.html
    EOF
  }

  labels = {
    environment = "development"
    created_by  = "terraform"
  }
}

`;

    // 추가 디스크 연결 (Road 연결만 - 스태킹도 아니고 연결도 없으면 무시)
    persistentDisks.forEach((disk) => {
      // 이 VM과 Disk 사이의 연결 찾기
      const diskConnection = connections.find(conn =>
        (conn.fromBlockId === vm.id && conn.toBlockId === disk.id) ||
        (conn.fromBlockId === disk.id && conn.toBlockId === vm.id)
      );

      // 연결이 없으면 무시 (별개의 관계)
      if (!diskConnection) {
        return;
      }

      // 스태킹 연결인지 확인 (부트 디스크)
      const isBootDisk = diskConnection.properties?.stackConnection === true &&
        diskConnection.properties?.volumeType === 'boot';

      // 부트디스크가 아니고 Road 연결인 경우만 attachment 생성
      if (!isBootDisk) {
        code += `# Disk Attachment (추가 디스크 - Road 연결): ${disk.name} → ${vm.name}
resource "google_compute_attached_disk" "${this.sanitizeResourceName(vm.id)}_${this.sanitizeResourceName(disk.id)}" {
  disk     = google_compute_disk.${this.sanitizeResourceName(disk.id)}.id
  instance = google_compute_instance.${this.sanitizeResourceName(vm.id)}.id
}

`;
      }
    });

    return code;
  }

  private static generateLoadBalancerCode(lb: CloudBlock): string { // subnets 사용하지 않음
    const name = lb.properties.name || lb.name;
    const loadBalancingScheme = lb.properties.loadBalancingScheme || "EXTERNAL";
    const protocol = lb.properties.protocol || "HTTP";
    const portRange = lb.properties.portRange || "80";

    return `# Load Balancer: ${name}
# Global HTTP Load Balancer 구성

# Backend Service
resource "google_compute_backend_service" "${this.sanitizeResourceName(lb.id)}_backend" {
  name        = "${name}-backend"
  protocol    = "${protocol}"
  port_name   = "http"
  timeout_sec = 10

  health_checks = [google_compute_health_check.${this.sanitizeResourceName(lb.id)}_health.id]

  load_balancing_scheme = "${loadBalancingScheme}"
}

# Health Check
resource "google_compute_health_check" "${this.sanitizeResourceName(lb.id)}_health" {
  name = "${name}-health-check"

  http_health_check {
    port = 80
    path = "/"
  }
}

# URL Map
resource "google_compute_url_map" "${this.sanitizeResourceName(lb.id)}_url_map" {
  name            = "${name}-url-map"
  default_service = google_compute_backend_service.${this.sanitizeResourceName(lb.id)}_backend.id
}

# HTTP Proxy
resource "google_compute_target_http_proxy" "${this.sanitizeResourceName(lb.id)}_proxy" {
  name    = "${name}-proxy"
  url_map = google_compute_url_map.${this.sanitizeResourceName(lb.id)}_url_map.id
}

# Forwarding Rule
resource "google_compute_global_forwarding_rule" "${this.sanitizeResourceName(lb.id)}_forwarding_rule" {
  name       = "${name}-forwarding-rule"
  target     = google_compute_target_http_proxy.${this.sanitizeResourceName(lb.id)}_proxy.id
  port_range = "${portRange}"
}

`;
  }

  /**
   * Terraform 리소스 이름 정리 (특수문자 제거)
   */
  private static sanitizeResourceName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }
}
