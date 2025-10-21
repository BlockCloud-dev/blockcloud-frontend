import type { CloudBlock } from '../../../core/types/common';
import type { Connection } from '../../../types/blocks';

/**
 * Azure Terraform 코드 생성기
 * Microsoft Azure 리소스에 대한 Terraform 코드 생성
 */
export class AzureTerraformGenerator {
    /**
     * Azure Terraform 코드 생성
     */
    static generateCode(blocks: CloudBlock[], connections: Connection[] = []): string {
        console.log("🔧 [AzureTerraformGenerator] Starting Azure Terraform code generation");
        console.log("🔧 [AzureTerraformGenerator] Blocks:", blocks.length);
        console.log("🔧 [AzureTerraformGenerator] Connections:", connections.length);

        if (!blocks.length) {
            return this.generateEmptyTemplate();
        }

        let code = this.generateHeader(blocks, connections);

        // Resource Group 먼저 생성 (모든 Azure 리소스의 기본)
        code += this.generateResourceGroupCode();

        // Virtual Network 생성
        const virtualNetworks = blocks.filter((block) => block.type === "virtual-network");
        virtualNetworks.forEach((vnet) => {
            code += this.generateVirtualNetworkCode(vnet);
        });

        // Subnet 생성
        const subnets = blocks.filter((block) => block.type === "subnet");
        subnets.forEach((subnet) => {
            code += this.generateSubnetCode(subnet, virtualNetworks);
        });

        // Network Security Groups 생성
        const nsgs = blocks.filter((block) => block.type === "network-security-group");
        nsgs.forEach((nsg) => {
            code += this.generateNetworkSecurityGroupCode(nsg);
        });

        // Managed Disks 생성
        const managedDisks = blocks.filter((block) => block.type === "managed-disk");
        managedDisks.forEach((disk) => {
            code += this.generateManagedDiskCode(disk);
        });

        // Virtual Machines 생성
        const virtualMachines = blocks.filter((block) => block.type === "virtual-machine");
        virtualMachines.forEach((vm) => {
            code += this.generateVirtualMachineCode(vm, subnets, nsgs, managedDisks);
        });

        // Storage Accounts 생성
        const storageAccounts = blocks.filter((block) => block.type === "storage-account");
        storageAccounts.forEach((storage) => {
            code += this.generateStorageAccountCode(storage);
        });

        // SQL Database 생성
        const sqlDatabases = blocks.filter((block) => block.type === "sql-database");
        sqlDatabases.forEach((sql) => {
            code += this.generateSQLDatabaseCode(sql);
        });

        // Load Balancers 생성
        const loadBalancers = blocks.filter((block) => block.type === "load-balancer");
        loadBalancers.forEach((lb) => {
            code += this.generateLoadBalancerCode(lb);
        });

        // Function Apps 생성
        const functionApps = blocks.filter((block) => block.type === "function-app");
        functionApps.forEach((fn) => {
            code += this.generateFunctionAppCode(fn, storageAccounts);
        });

        return code;
    }

    private static generateEmptyTemplate(): string {
        return `# 아직 블록이 없습니다. 
# 팔레트에서 블록을 드래그하여 캔버스에 배치하세요.

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "resource_group_name" {
  description = "Azure Resource Group Name"
  type        = string
  default     = "rg-blockcloud"
}

variable "location" {
  description = "Azure Location"
  type        = string
  default     = "Korea Central"
}
`;
    }

    private static generateHeader(blocks: CloudBlock[], connections: Connection[]): string {
        return `# Azure 인프라 - Terraform 코드
# 마지막 업데이트: ${new Date().toLocaleString()}
# 총 블록 수: ${blocks.length}개
# 총 연결 수: ${connections.length}개

terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = false
    }
  }
}

variable "resource_group_name" {
  description = "Azure Resource Group Name"
  type        = string
  default     = "rg-blockcloud"
}

variable "location" {
  description = "Azure Location"
  type        = string
  default     = "Korea Central"
}

`;
    }

    private static generateResourceGroupCode(): string {
        return `# Resource Group: 모든 리소스의 컨테이너
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = "Development"
    CreatedBy   = "Terraform"
    Project     = "BlockCloud"
  }
}

`;
    }

    private static generateVirtualNetworkCode(vnet: CloudBlock): string {
        const name = vnet.properties.name || vnet.name;
        const addressSpace = vnet.properties.addressSpace || ["10.0.0.0/16"];
        // const location = vnet.properties.location || "Korea Central"; // 사용하지 않음

        return `# Virtual Network: ${name}
resource "azurerm_virtual_network" "${this.sanitizeResourceName(vnet.id)}" {
  name                = "${name}"
  address_space       = ${JSON.stringify(addressSpace)}
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  tags = {
    Name        = "${name}"
    Type        = "VirtualNetwork"
    Environment = "Development"
  }
}

`;
    }

    private static generateSubnetCode(subnet: CloudBlock, virtualNetworks: CloudBlock[]): string {
        const name = subnet.properties.name || subnet.name;
        const addressPrefix = subnet.properties.addressPrefix || "10.0.1.0/24";

        // Virtual Network 참조 찾기 (첫 번째 VNet 사용)
        const vnetRef = virtualNetworks.length > 0 ?
            `azurerm_virtual_network.${this.sanitizeResourceName(virtualNetworks[0].id)}.name` :
            '"default-vnet"';

        return `# Subnet: ${name}
resource "azurerm_subnet" "${this.sanitizeResourceName(subnet.id)}" {
  name                 = "${name}"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = ${vnetRef}
  address_prefixes     = ["${addressPrefix}"]

  # 서비스 엔드포인트 (필요시)
  service_endpoints = ["Microsoft.Storage", "Microsoft.Sql"]
}

`;
    }

    private static generateNetworkSecurityGroupCode(nsg: CloudBlock): string {
        const name = nsg.properties.name || nsg.name;
        const securityRules = nsg.properties.securityRules || [];

        let code = `# Network Security Group: ${name}
resource "azurerm_network_security_group" "${this.sanitizeResourceName(nsg.id)}" {
  name                = "${name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

`;

        // 보안 규칙 추가
        securityRules.forEach((rule: any) => {
            code += `  security_rule {
    name                       = "${rule.name}"
    priority                   = ${rule.priority}
    direction                  = "${rule.direction}"
    access                     = "${rule.access}"
    protocol                   = "${rule.protocol}"
    source_port_range          = "${rule.sourcePortRange}"
    destination_port_range     = "${rule.destinationPortRange}"
    source_address_prefix      = "${rule.sourceAddressPrefix}"
    destination_address_prefix = "${rule.destinationAddressPrefix}"
  }

`;
        });

        code += `  tags = {
    Name        = "${name}"
    Type        = "NetworkSecurityGroup"
    Environment = "Development"
  }
}

`;

        return code;
    }

    private static generateManagedDiskCode(disk: CloudBlock): string {
        const name = disk.properties.name || disk.name;
        const storageAccountType = disk.properties.storageAccountType || "Standard_LRS";
        const diskSizeGb = disk.properties.diskSizeGb || 30;
        const createOption = disk.properties.createOption || "Empty";

        return `# Managed Disk: ${name}
resource "azurerm_managed_disk" "${this.sanitizeResourceName(disk.id)}" {
  name                 = "${name}"
  location             = azurerm_resource_group.main.location
  resource_group_name  = azurerm_resource_group.main.name
  storage_account_type = "${storageAccountType}"
  create_option        = "${createOption}"
  disk_size_gb         = ${diskSizeGb}

  tags = {
    Name        = "${name}"
    Type        = "ManagedDisk"
    Environment = "Development"
  }
}

`;
    }

    private static generateVirtualMachineCode(
        vm: CloudBlock,
        subnets: CloudBlock[],
        nsgs: CloudBlock[],
        managedDisks: CloudBlock[]
        // connections 사용하지 않음
    ): string {
        const name = vm.properties.name || vm.name;
        const size = vm.properties.size || "Standard_B1s";
        const adminUsername = vm.properties.adminUsername || "azureuser";
        const storageImageReference = vm.properties.storageImageReference || {
            publisher: "Canonical",
            offer: "0001-com-ubuntu-server-focal",
            sku: "20_04-lts-gen2",
            version: "latest"
        };

        const subnetRef = subnets.length > 0 ?
            `azurerm_subnet.${this.sanitizeResourceName(subnets[0].id)}.id` :
            '"subnet-id"';

        let code = `# Public IP for VM: ${name}
resource "azurerm_public_ip" "${this.sanitizeResourceName(vm.id)}_pip" {
  name                = "${name}-pip"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Dynamic"

  tags = {
    Environment = "Development"
  }
}

# Network Interface for VM: ${name}
resource "azurerm_network_interface" "${this.sanitizeResourceName(vm.id)}_nic" {
  name                = "${name}-nic"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = ${subnetRef}
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.${this.sanitizeResourceName(vm.id)}_pip.id
  }

  tags = {
    Environment = "Development"
  }
}

# Virtual Machine: ${name}
resource "azurerm_linux_virtual_machine" "${this.sanitizeResourceName(vm.id)}" {
  name                = "${name}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "${size}"
  admin_username      = "${adminUsername}"

  disable_password_authentication = true

  network_interface_ids = [
    azurerm_network_interface.${this.sanitizeResourceName(vm.id)}_nic.id,
  ]

  admin_ssh_key {
    username   = "${adminUsername}"
    public_key = file("~/.ssh/id_rsa.pub")  # SSH 키 경로 수정 필요
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "${storageImageReference.publisher}"
    offer     = "${storageImageReference.offer}"
    sku       = "${storageImageReference.sku}"
    version   = "${storageImageReference.version}"
  }

  tags = {
    Name        = "${name}"
    Type        = "VirtualMachine"
    Environment = "Development"
  }
}

`;

        // NSG를 NIC에 연결
        if (nsgs.length > 0) {
            code += `# NSG Association for VM: ${name}
resource "azurerm_network_interface_security_group_association" "${this.sanitizeResourceName(vm.id)}_nsg_association" {
  network_interface_id      = azurerm_network_interface.${this.sanitizeResourceName(vm.id)}_nic.id
  network_security_group_id = azurerm_network_security_group.${this.sanitizeResourceName(nsgs[0].id)}.id
}

`;
        }

        // 추가 디스크 연결
        managedDisks.forEach((disk) => {
            code += `# Disk Attachment: ${disk.name} → ${vm.name}
resource "azurerm_virtual_machine_data_disk_attachment" "${this.sanitizeResourceName(vm.id)}_${this.sanitizeResourceName(disk.id)}" {
  managed_disk_id    = azurerm_managed_disk.${this.sanitizeResourceName(disk.id)}.id
  virtual_machine_id = azurerm_linux_virtual_machine.${this.sanitizeResourceName(vm.id)}.id
  lun                = "10"
  caching            = "ReadWrite"
}

`;
        });

        return code;
    }

    private static generateStorageAccountCode(storage: CloudBlock): string {
        const name = (storage.properties.name || storage.name).toLowerCase().replace(/[^a-z0-9]/g, '');
        const accountTier = storage.properties.accountTier || "Standard";
        const accountReplicationType = storage.properties.accountReplicationType || "LRS";
        const accountKind = storage.properties.accountKind || "StorageV2";

        return `# Storage Account: ${name}
resource "azurerm_storage_account" "${this.sanitizeResourceName(storage.id)}" {
  name                     = "${name}\${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "${accountTier}"
  account_replication_type = "${accountReplicationType}"
  account_kind            = "${accountKind}"

  tags = {
    Name        = "${name}"
    Type        = "StorageAccount"
    Environment = "Development"
  }
}

# 스토리지 계정명 고유성을 위한 랜덤 문자열
resource "random_string" "storage_suffix" {
  length  = 4
  special = false
  upper   = false
}

`;
    }

    private static generateSQLDatabaseCode(sql: CloudBlock): string {
        const name = sql.properties.name || sql.name;
        const serverName = sql.properties.serverName || "sqlserver";
        // const edition = sql.properties.edition || "Basic"; // 사용하지 않음
        const requestedServiceObjectiveName = sql.properties.requestedServiceObjectiveName || "Basic";

        return `# SQL Server: ${serverName}
resource "azurerm_mssql_server" "${this.sanitizeResourceName(sql.id)}_server" {
  name                         = "${serverName}-\${random_string.sql_suffix.result}"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = "P@ssw0rd123!"  # 실제 환경에서는 변수 사용

  tags = {
    Environment = "Development"
  }
}

# SQL Database: ${name}
resource "azurerm_mssql_database" "${this.sanitizeResourceName(sql.id)}" {
  name           = "${name}"
  server_id      = azurerm_mssql_server.${this.sanitizeResourceName(sql.id)}_server.id
  collation      = "SQL_Latin1_General_CP1_CI_AS"
  license_type   = "LicenseIncluded"
  sku_name       = "${requestedServiceObjectiveName}"

  tags = {
    Name        = "${name}"
    Type        = "SQLDatabase"
    Environment = "Development"
  }
}

# SQL Server 이름 고유성을 위한 랜덤 문자열
resource "random_string" "sql_suffix" {
  length  = 4
  special = false
  upper   = false
}

`;
    }

    private static generateLoadBalancerCode(lb: CloudBlock): string { // subnets 사용하지 않음
        const name = lb.properties.name || lb.name;
        const sku = lb.properties.sku || "Standard";
        // const type = lb.properties.type || "Public"; // 사용하지 않음

        return `# Public IP for Load Balancer: ${name}
resource "azurerm_public_ip" "${this.sanitizeResourceName(lb.id)}_pip" {
  name                = "${name}-pip"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                = "${sku}"

  tags = {
    Environment = "Development"
  }
}

# Load Balancer: ${name}
resource "azurerm_lb" "${this.sanitizeResourceName(lb.id)}" {
  name                = "${name}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                = "${sku}"

  frontend_ip_configuration {
    name                 = "PublicIPAddress"
    public_ip_address_id = azurerm_public_ip.${this.sanitizeResourceName(lb.id)}_pip.id
  }

  tags = {
    Name        = "${name}"
    Type        = "LoadBalancer"
    Environment = "Development"
  }
}

`;
    }

    private static generateFunctionAppCode(fn: CloudBlock, storageAccounts: CloudBlock[]): string {
        const name = fn.properties.name || fn.name;
        const runtime = fn.properties.runtime || "python";
        const version = fn.properties.version || "~4";

        const storageRef = storageAccounts.length > 0 ?
            `azurerm_storage_account.${this.sanitizeResourceName(storageAccounts[0].id)}.name` :
            '"storageaccount"';

        return `# App Service Plan for Function App: ${name}
resource "azurerm_service_plan" "${this.sanitizeResourceName(fn.id)}_plan" {
  name                = "${name}-plan"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name           = "Y1"  # Consumption plan
}

# Function App: ${name}
resource "azurerm_linux_function_app" "${this.sanitizeResourceName(fn.id)}" {
  name                = "${name}-\${random_string.function_suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  storage_account_name       = ${storageRef}
  storage_account_access_key = azurerm_storage_account.${storageAccounts.length > 0 ? this.sanitizeResourceName(storageAccounts[0].id) : 'default'}.primary_access_key
  service_plan_id           = azurerm_service_plan.${this.sanitizeResourceName(fn.id)}_plan.id

  site_config {
    application_stack {
      python_version = "3.9"
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" = "${runtime}"
    "FUNCTIONS_EXTENSION_VERSION" = "${version}"
  }

  tags = {
    Name        = "${name}"
    Type        = "FunctionApp"
    Environment = "Development"
  }
}

# Function App 이름 고유성을 위한 랜덤 문자열
resource "random_string" "function_suffix" {
  length  = 4
  special = false
  upper   = false
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
