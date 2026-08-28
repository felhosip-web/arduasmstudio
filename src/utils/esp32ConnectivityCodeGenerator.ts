import { Esp32WifiState, Esp32BleState } from '../types';

/**
 * Utility to parse an IPv4 string (e.g. "192.168.1.150") into comma-separated bytes ("192, 168, 1, 150")
 */
export function formatIpAddressToBytes(ipStr?: string, fallback: string = '192, 168, 1, 1'): string {
  if (!ipStr) return fallback;
  const parts = ipStr.trim().split('.');
  if (parts.length === 4 && parts.every((p) => !isNaN(parseInt(p, 10)) && parseInt(p, 10) >= 0 && parseInt(p, 10) <= 255)) {
    return parts.map((p) => parseInt(p, 10)).join(', ');
  }
  return fallback;
}

/**
 * Generate Arduino C++ connectivity code snippets and setup logic
 */
export function generateArduinoConnectivityC(wifi?: Esp32WifiState, ble?: Esp32BleState): string {
  const lines: string[] = [
    '// =====================================================================',
    '// ESP32 Hardveres Hálózati (WiFi & BLE) Inicializáló Setup Kód',
    '// Keretrendszer: Arduino-ESP32 Core (WiFi.h & ESP32 BLE Arduino)',
    '// =====================================================================',
    '#include <Arduino.h>',
  ];

  const hasWifi = wifi && wifi.mode !== 'OFF';
  const hasBle = ble && ble.enabled && ble.mode !== 'OFF';

  if (hasWifi) {
    lines.push('#include <WiFi.h>');
  }

  if (hasBle) {
    lines.push('#include <BLEDevice.h>');
    lines.push('#include <BLEServer.h>');
    lines.push('#include <BLEUtils.h>');
    lines.push('#include <BLE2902.h>');
    if (ble.mode === 'IBEACON') {
      lines.push('#include <BLEBeacon.h>');
    }
  }

  lines.push('');

  // 1. WiFi Global Configuration
  if (hasWifi && wifi) {
    lines.push('// -------------------------------------------------------------');
    lines.push('// WiFi Hálózati Paraméterek & Statikus IP Konfiguráció');
    lines.push('// -------------------------------------------------------------');
    if (wifi.mode === 'STA' || wifi.mode === 'AP_STA') {
      lines.push(`const char* WIFI_SSID = "${wifi.ssid || 'IoT_Studio_WiFi'}";`);
      lines.push(`const char* WIFI_PASS = "${wifi.password || ''}";`);
      if (wifi.hostname) {
        lines.push(`const char* HOSTNAME  = "${wifi.hostname}";`);
      }
      if (wifi.useStaticIp) {
        lines.push(`IPAddress local_IP(${formatIpAddressToBytes(wifi.ipAddress, '192, 168, 1, 150')});`);
        lines.push(`IPAddress gateway(${formatIpAddressToBytes(wifi.gateway, '192, 168, 1, 1')});`);
        lines.push(`IPAddress subnet(${formatIpAddressToBytes(wifi.subnet, '255, 255, 255, 0')});`);
        lines.push(`IPAddress primaryDNS(${formatIpAddressToBytes(wifi.dns, '8, 8, 8, 8')});`);
        if (wifi.dns2) {
          lines.push(`IPAddress secondaryDNS(${formatIpAddressToBytes(wifi.dns2, '1, 1, 1, 1')});`);
        }
      }
    }

    if (wifi.mode === 'AP' || wifi.mode === 'AP_STA') {
      lines.push(`const char* AP_SSID = "${wifi.apSsid || 'ESP32_AccessPoint'}";`);
      lines.push(`const char* AP_PASS = "${wifi.apPassword || 'esp32password'}";`);
      lines.push(`const int   AP_CHANNEL = ${wifi.apChannel || 1};`);
      lines.push(`const int   AP_MAX_CONN = ${wifi.apMaxConnections || 4};`);
      if (wifi.apIpAddress) {
        lines.push(`IPAddress ap_IP(${formatIpAddressToBytes(wifi.apIpAddress, '192, 168, 4, 1')});`);
      }
    }
    lines.push('');
  }

  // 2. BLE Global Configuration
  if (hasBle && ble) {
    lines.push('// -------------------------------------------------------------');
    lines.push('// BLE Advertising & GATT Szerver UUID Definíciók');
    lines.push('// -------------------------------------------------------------');
    lines.push(`#define BLE_DEVICE_NAME   "${ble.deviceName || 'ESP32_BLE'}"`);
    
    const primaryService = ble.services?.[0];
    const srvUuid = primaryService?.uuid || '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
    lines.push(`#define SERVICE_UUID      "${srvUuid}"`);
    
    primaryService?.characteristics?.forEach((char, idx) => {
      lines.push(`#define CHAR_${idx + 1}_UUID        "${char.uuid}" // ${char.name}`);
    });

    lines.push('BLEServer* pServer = nullptr;');
    lines.push('BLECharacteristic* pCharacteristic = nullptr;');
    lines.push('bool deviceConnected = false;');
    lines.push('');
    lines.push('class ServerCallbacks: public BLEServerCallbacks {');
    lines.push('  void onConnect(BLEServer* pServer) { deviceConnected = true; Serial.println("[BLE] Kliens csatlakozott!"); }');
    lines.push('  void onDisconnect(BLEServer* pServer) {');
    lines.push('    deviceConnected = false;');
    lines.push('    Serial.println("[BLE] Kliens lecsatlakozott -> Hirdetés újraindítása...");');
    lines.push('    pServer->startAdvertising();');
    lines.push('  }');
    lines.push('};');
    lines.push('');
  }

  // 3. Setup Function
  lines.push('void setupConnectivity() {');
  
  if (hasWifi && wifi) {
    lines.push('  // === 1. WiFi Inicializálás ===');
    if (wifi.hostname) {
      lines.push('  WiFi.setHostname(HOSTNAME);');
    }

    if (wifi.autoReconnect) {
      lines.push('  WiFi.setAutoReconnect(true);');
    }

    if (wifi.mode === 'STA') {
      lines.push('  WiFi.mode(WIFI_STA);');
      if (wifi.useStaticIp) {
        lines.push('  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS)) {');
        lines.push('    Serial.println("[WiFi] Statikus IP beállítás sikertelen!");');
        lines.push('  }');
      }
      lines.push('  WiFi.begin(WIFI_SSID, WIFI_PASS);');
      lines.push('  Serial.print("[WiFi] Csatlakozás a következő SSID-hez: ");');
      lines.push('  Serial.println(WIFI_SSID);');
      lines.push('  int timeout = 0;');
      lines.push('  while (WiFi.status() != WL_CONNECTED && timeout < 20) {');
      lines.push('    delay(500);');
      lines.push('    Serial.print(".");');
      lines.push('    timeout++;');
      lines.push('  }');
      lines.push('  if (WiFi.status() == WL_CONNECTED) {');
      lines.push('    Serial.println("\\n[WiFi] Sikeresen csatlakozva!");');
      lines.push('    Serial.print("[WiFi] IP Cím: "); Serial.println(WiFi.localIP());');
      lines.push('    Serial.print("[WiFi] RSSI: "); Serial.print(WiFi.RSSI()); Serial.println(" dBm");');
      lines.push('  } else {');
      lines.push('    Serial.println("\\n[WiFi] Csatlakozási időtúllépés!");');
      lines.push('  }');
    } else if (wifi.mode === 'AP') {
      lines.push('  WiFi.mode(WIFI_AP);');
      if (wifi.apIpAddress) {
        lines.push('  WiFi.softAPConfig(ap_IP, ap_IP, IPAddress(255, 255, 255, 0));');
      }
      lines.push('  WiFi.softAP(AP_SSID, AP_PASS, AP_CHANNEL, 0, AP_MAX_CONN);');
      lines.push('  Serial.print("[WiFi SoftAP] Hotspot elindítva: "); Serial.println(AP_SSID);');
      lines.push('  Serial.print("[WiFi SoftAP] AP IP Cím: "); Serial.println(WiFi.softAPIP());');
    } else if (wifi.mode === 'AP_STA') {
      lines.push('  WiFi.mode(WIFI_AP_STA);');
      lines.push('  WiFi.begin(WIFI_SSID, WIFI_PASS);');
      lines.push('  WiFi.softAP(AP_SSID, AP_PASS, AP_CHANNEL, 0, AP_MAX_CONN);');
      lines.push('  Serial.println("[WiFi Dual] STA és SoftAP együttesen aktív.");');
    }
    lines.push('');
  }

  if (hasBle && ble) {
    lines.push('  // === 2. BLE Advertising & GATT Szerver Indítás ===');
    lines.push('  BLEDevice::init(BLE_DEVICE_NAME);');
    lines.push(`  BLEDevice::setPower(${ble.txPower || 'ESP_PWR_LVL_P3'});`);
    lines.push('');

    if (ble.mode === 'IBEACON') {
      lines.push('  // Apple iBeacon Sugárzó Csomag Összeállítása');
      lines.push('  BLEBeacon myBeacon;');
      lines.push(`  myBeacon.setManufacturerId(${ble.iBeacon.companyIdHex || '0x004C'});`);
      lines.push(`  BLEUUID beaconUUID("${ble.iBeacon.proximityUuid || 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825'}");`);
      lines.push('  myBeacon.setProximityUUID(beaconUUID);');
      lines.push(`  myBeacon.setMajor(${ble.iBeacon.major || 10001});`);
      lines.push(`  myBeacon.setMinor(${ble.iBeacon.minor || 20002});`);
      lines.push(`  myBeacon.setSignalPower(${ble.iBeacon.measuredPowerRssiAt1m || -59});`);
      lines.push('');
      lines.push('  BLEAdvertisementData oAdvertisementData;');
      lines.push('  oAdvertisementData.setFlags(0x04); // BR_EDR_NOT_SUPPORTED');
      lines.push('  std::string strServiceData = "";');
      lines.push('  strServiceData += (char)26;     // Hossz');
      lines.push('  strServiceData += (char)0xFF;   // Gyártói Adat Típus');
      lines.push('  strServiceData += myBeacon.getData();');
      lines.push('  oAdvertisementData.addData(strServiceData);');
      lines.push('');
      lines.push('  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();');
      lines.push('  pAdvertising->setAdvertisementData(oAdvertisementData);');
      lines.push(`  pAdvertising->setMinInterval(${Math.round((ble.advIntervalMinMs || 100) / 0.625)});`);
      lines.push(`  pAdvertising->setMaxInterval(${Math.round((ble.advIntervalMaxMs || 200) / 0.625)});`);
      lines.push('  BLEDevice::startAdvertising();');
      lines.push('  Serial.println("[BLE iBeacon] Sugárzás elindítva!");');
    } else {
      lines.push('  pServer = BLEDevice::createServer();');
      lines.push('  pServer->setCallbacks(new ServerCallbacks());');
      lines.push('');
      lines.push('  BLEService *pService = pServer->createService(SERVICE_UUID);');
      
      const primaryService = ble.services?.[0];
      primaryService?.characteristics?.forEach((char, idx) => {
        const propFlags: string[] = [];
        if (char.permissions.includes('READ')) propFlags.push('BLECharacteristic::PROPERTY_READ');
        if (char.permissions.includes('WRITE')) propFlags.push('BLECharacteristic::PROPERTY_WRITE');
        if (char.permissions.includes('NOTIFY')) propFlags.push('BLECharacteristic::PROPERTY_NOTIFY');
        if (char.permissions.includes('INDICATE')) propFlags.push('BLECharacteristic::PROPERTY_INDICATE');
        const flagStr = propFlags.length > 0 ? propFlags.join(' | ') : 'BLECharacteristic::PROPERTY_READ';

        lines.push(`  // Karakterisztika #${idx + 1}: ${char.name}`);
        lines.push(`  BLECharacteristic* pChar${idx + 1} = pService->createCharacteristic(CHAR_${idx + 1}_UUID, ${flagStr});`);
        if (char.permissions.includes('NOTIFY')) {
          lines.push(`  pChar${idx + 1}->addDescriptor(new BLE2902());`);
        }
        lines.push(`  pChar${idx + 1}->setValue("${char.value || '0'}");`);
      });

      lines.push('');
      lines.push('  pService->start();');
      lines.push('  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();');
      lines.push('  pAdvertising->addServiceUUID(SERVICE_UUID);');
      lines.push('  pAdvertising->setScanResponse(true);');
      lines.push('  pAdvertising->setMinPreferred(0x06);');
      lines.push(`  pAdvertising->setMinInterval(${Math.round((ble.advIntervalMinMs || 100) / 0.625)});`);
      lines.push(`  pAdvertising->setMaxInterval(${Math.round((ble.advIntervalMaxMs || 200) / 0.625)});`);
      lines.push('  BLEDevice::startAdvertising();');
      lines.push('  Serial.println("[BLE GATT] Szolgáltatás elindítva, hirdetés aktív!");');
    }
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Generate native ESP-IDF C connectivity initialization code (esp_wifi + BLE GAP)
 */
export function generateEspIdfConnectivityC(wifi?: Esp32WifiState, ble?: Esp32BleState): string {
  const lines: string[] = [
    '// =====================================================================',
    '// ESP32 Natív ESP-IDF C Hálózati & BLE Inicializáló Forráskód',
    '// Keretrendszer: ESP-IDF v4.x / v5.x (FreeRTOS, esp_wifi, esp_gap_ble_api)',
    '// =====================================================================',
    '#include <stdio.h>',
    '#include <string.h>',
    '#include "esp_system.h"',
    '#include "esp_log.h"',
    '#include "nvs_flash.h"',
    '#include "esp_event.h"',
    '#include "esp_netif.h"',
    '#include "esp_wifi.h"',
    '#include "esp_bt.h"',
    '#include "esp_gap_ble_api.h"',
    '#include "esp_gatts_api.h"',
    '#include "esp_bt_main.h"',
    '',
    'static const char* TAG = "ESP32_CONNECTIVITY";',
    '',
  ];

  const hasWifi = wifi && wifi.mode !== 'OFF';
  const hasBle = ble && ble.enabled && ble.mode !== 'OFF';

  if (hasWifi && wifi) {
    lines.push('// WiFi Eseménykezelő Rutin');
    lines.push('static void wifi_event_handler(void* arg, esp_event_base_t event_base, int32_t event_id, void* event_data) {');
    lines.push('  if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {');
    lines.push('    esp_wifi_connect();');
    lines.push('  } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {');
    lines.push('    ESP_LOGW(TAG, "WiFi kapcsolat megszakadt -> Újracsatlakozás...");');
    lines.push('    esp_wifi_connect();');
    lines.push('  } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {');
    lines.push('    ip_event_got_ip_t* event = (ip_event_got_ip_t*) event_data;');
    lines.push('    ESP_LOGI(TAG, "Sikeres IP cím: " IPSTR, IP2STR(&event->ip_info.ip));');
    lines.push('  }');
    lines.push('}');
    lines.push('');
  }

  lines.push('void app_connectivity_init(void) {');
  lines.push('  // 1. NVS Flash Inicializálás (WiFi & BLE kalibráció tárolásához elengedhetetlen)');
  lines.push('  esp_err_t ret = nvs_flash_init();');
  lines.push('  if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {');
  lines.push('    ESP_ERROR_CHECK(nvs_flash_erase());');
  lines.push('    ret = nvs_flash_init();');
  lines.push('  }');
  lines.push('  ESP_ERROR_CHECK(ret);');
  lines.push('');

  if (hasWifi && wifi) {
    lines.push('  // 2. TCP/IP Stack & WiFi Inicializálás');
    lines.push('  ESP_ERROR_CHECK(esp_netif_init());');
    lines.push('  ESP_ERROR_CHECK(esp_event_loop_create_default());');
    lines.push('  esp_netif_t* sta_netif = esp_netif_create_default_wifi_sta();');
    lines.push('');

    if (wifi.useStaticIp) {
      lines.push('  // Statikus IP Cím beállítása (DHCP kikapcsolása a hálózati interfészen)');
      lines.push('  esp_netif_dhcpc_stop(sta_netif);');
      lines.push('  esp_netif_ip_info_t ip_info;');
      lines.push(`  IP4_ADDR(&ip_info.ip, ${formatIpAddressToBytes(wifi.ipAddress, '192, 168, 1, 150')});`);
      lines.push(`  IP4_ADDR(&ip_info.gw, ${formatIpAddressToBytes(wifi.gateway, '192, 168, 1, 1')});`);
      lines.push(`  IP4_ADDR(&ip_info.netmask, ${formatIpAddressToBytes(wifi.subnet, '255, 255, 255, 0')});`);
      lines.push('  esp_netif_set_ip_info(sta_netif, &ip_info);');
      lines.push('');
    }

    lines.push('  wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();');
    lines.push('  ESP_ERROR_CHECK(esp_wifi_init(&cfg));');
    lines.push('  ESP_ERROR_CHECK(esp_event_handler_instance_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));');
    lines.push('  ESP_ERROR_CHECK(esp_event_handler_instance_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL));');
    lines.push('');
    lines.push('  wifi_config_t wifi_config = {');
    lines.push('    .sta = {');
    lines.push(`      .ssid = "${wifi.ssid || 'IoT_Studio_WiFi'}",`);
    lines.push(`      .password = "${wifi.password || ''}",`);
    lines.push('      .threshold.authmode = WIFI_AUTH_WPA2_PSK,');
    lines.push('    },');
    lines.push('  };');
    lines.push('  ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));');
    lines.push('  ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));');
    lines.push('  ESP_ERROR_CHECK(esp_wifi_start());');
    lines.push('  ESP_LOGI(TAG, "WiFi STA Inicializálva.");');
    lines.push('');
  }

  if (hasBle && ble) {
    lines.push('  // 3. BLE Bluetooth Controller & Stack Inicializálás');
    lines.push('  ESP_ERROR_CHECK(esp_bt_controller_mem_release(ESP_BT_MODE_CLASSIC_BT));');
    lines.push('  esp_bt_controller_config_t bt_cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();');
    lines.push('  ESP_ERROR_CHECK(esp_bt_controller_init(&bt_cfg));');
    lines.push('  ESP_ERROR_CHECK(esp_bt_controller_enable(ESP_BT_MODE_BLE));');
    lines.push('  ESP_ERROR_CHECK(esp_bluedroid_init());');
    lines.push('  ESP_ERROR_CHECK(esp_bluedroid_enable());');
    lines.push('');
    lines.push(`  ESP_LOGI(TAG, "BLE Hardver Aktív: %s (TxPower: %s)", "${ble.deviceName || 'ESP32_BLE'}", "${ble.txPower}");`);
  }

  lines.push('}');
  return lines.join('\n');
}

/**
 * Helper to extract snippet lines to be embedded into the main Arduino setup() in codeGenerator
 */
export function generateConnectivitySetupLines(wifi?: Esp32WifiState, ble?: Esp32BleState): {
  includes: string[];
  globals: string[];
  setupLines: string[];
} {
  const includes: string[] = [];
  const globals: string[] = [];
  const setupLines: string[] = [];

  const hasWifi = wifi && wifi.mode !== 'OFF';
  const hasBle = ble && ble.enabled && ble.mode !== 'OFF';

  if (hasWifi && wifi) {
    includes.push('#include <WiFi.h>');
    if (wifi.mode === 'STA' || wifi.mode === 'AP_STA') {
      globals.push(`const char* WIFI_SSID = "${wifi.ssid || 'IoT_Studio_WiFi'}";`);
      globals.push(`const char* WIFI_PASS = "${wifi.password || ''}";`);
      if (wifi.useStaticIp) {
        globals.push(`IPAddress local_IP(${formatIpAddressToBytes(wifi.ipAddress, '192, 168, 1, 150')});`);
        globals.push(`IPAddress gateway(${formatIpAddressToBytes(wifi.gateway, '192, 168, 1, 1')});`);
        globals.push(`IPAddress subnet(${formatIpAddressToBytes(wifi.subnet, '255, 255, 255, 0')});`);
        globals.push(`IPAddress primaryDNS(${formatIpAddressToBytes(wifi.dns, '8, 8, 8, 8')});`);
      }
    }
    if (wifi.mode === 'AP' || wifi.mode === 'AP_STA') {
      globals.push(`const char* AP_SSID = "${wifi.apSsid || 'ESP32_AccessPoint'}";`);
      globals.push(`const char* AP_PASS = "${wifi.apPassword || 'esp32password'}";`);
    }

    setupLines.push('  // [WiFi Setup] Hálózati Kapcsolat Inicializálása');
    if (wifi.mode === 'STA') {
      setupLines.push('  WiFi.mode(WIFI_STA);');
      if (wifi.useStaticIp) {
        setupLines.push('  WiFi.config(local_IP, gateway, subnet, primaryDNS); // Statikus IP');
      }
      setupLines.push('  WiFi.begin(WIFI_SSID, WIFI_PASS);');
      setupLines.push('  Serial.println("[WiFi] Csatlakozás folyamatban...");');
    } else if (wifi.mode === 'AP') {
      setupLines.push('  WiFi.mode(WIFI_AP);');
      setupLines.push(`  WiFi.softAP(AP_SSID, AP_PASS, ${wifi.apChannel || 1});`);
      setupLines.push('  Serial.println("[WiFi] SoftAP Hozzáférési Pont elindítva!");');
    } else if (wifi.mode === 'AP_STA') {
      setupLines.push('  WiFi.mode(WIFI_AP_STA);');
      setupLines.push('  WiFi.begin(WIFI_SSID, WIFI_PASS);');
      setupLines.push(`  WiFi.softAP(AP_SSID, AP_PASS, ${wifi.apChannel || 1});`);
    }
  }

  if (hasBle && ble) {
    includes.push('#include <BLEDevice.h>');
    includes.push('#include <BLEServer.h>');
    includes.push('#include <BLEUtils.h>');
    includes.push('#include <BLE2902.h>');

    const srvUuid = ble.services?.[0]?.uuid || '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
    globals.push(`// BLE Konfiguráció`);
    globals.push(`#define BLE_DEVICE_NAME "${ble.deviceName || 'ESP32_BLE'}"`);
    globals.push(`#define BLE_SERVICE_UUID "${srvUuid}"`);

    setupLines.push('  // [BLE Setup] Bluetooth Low Energy Hirdetés & GATT Szerver');
    setupLines.push('  BLEDevice::init(BLE_DEVICE_NAME);');
    setupLines.push(`  BLEDevice::setPower(${ble.txPower || 'ESP_PWR_LVL_P3'});`);
    setupLines.push('  BLEServer *pBleServer = BLEDevice::createServer();');
    setupLines.push('  BLEService *pBleService = pBleServer->createService(BLE_SERVICE_UUID);');
    setupLines.push('  pBleService->start();');
    setupLines.push('  BLEAdvertising *pBleAdv = BLEDevice::getAdvertising();');
    setupLines.push('  pBleAdv->addServiceUUID(BLE_SERVICE_UUID);');
    setupLines.push('  pBleAdv->setScanResponse(true);');
    setupLines.push(`  pBleAdv->setMinInterval(${Math.round((ble.advIntervalMinMs || 100) / 0.625)});`);
    setupLines.push('  BLEDevice::startAdvertising();');
    setupLines.push('  Serial.println("[BLE] Hirdetés aktív!");');
  }

  return { includes, globals, setupLines };
}
