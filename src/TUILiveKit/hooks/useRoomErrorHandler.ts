import { onBeforeMount, onUnmounted } from 'vue';
import { TUIErrorCode } from '@tencentcloud/tuiroom-engine-electron';
import TUIMessageBox from '../common/base/MessageBox';
import { useI18n } from '../locales/index';
import logger from '../utils/logger';

const logPrefix = '[useErrorHandler]';

const { t } = useI18n();

const RoomErrorInfo: { [key: number]: {
  code: number;
  messageI18n: string;
}} = {
  [TUIErrorCode.ERR_SUCC]: {
    code:0,
    messageI18n: t('ERR_SUCC'),
  },
  [TUIErrorCode.ERR_FAILED]: {
    code:-1,
    messageI18n: t('ERR_FAILED'),
  },
  [TUIErrorCode.ERR_FREQ_LIMIT]: {
    code:-2,
    messageI18n: t('ERR_FREQ_LIMIT'),
  },
  [TUIErrorCode.ERR_REPEAT_OPERATION]: {
    code:-3,
    messageI18n: t('ERR_REPEAT_OPERATION'),
  },
  [TUIErrorCode.ERR_ROOM_MISMATCH]: {
    code:-4,
    messageI18n: t('ERR_ROOM_MISMATCH'),
  },
  [TUIErrorCode.ERR_SDKAPPID_NOT_FOUND]: {
    code:-1000,
    messageI18n: t('ERR_SDKAPPID_NOT_FOUND'),
  },
  [TUIErrorCode.ERR_INVALID_PARAMETER]: {
    code:-1001,
    messageI18n: t('ERR_INVALID_PARAMETER'),
  },
  [TUIErrorCode.ERR_SDK_NOT_INITIALIZED]: {
    code:-1002,
    messageI18n: t('ERR_SDK_NOT_INITIALIZED'),
  },
  [TUIErrorCode.ERR_PERMISSION_DENIED]: {
    code:-1003,
    messageI18n: t('ERR_PERMISSION_DENIED'),
  },
  [TUIErrorCode.ERR_REQUIRE_PAYMENT]: {
    code:-1004,
    messageI18n: t('ERR_REQUIRE_PAYMENT'),
  },
  [TUIErrorCode.ERR_CAMERA_START_FAILED]: {
    code:-1100,
    messageI18n: t('ERR_CAMERA_START_FAILED'),
  },
  [TUIErrorCode.ERR_CAMERA_NOT_AUTHORIZED]: {
    code:-1101,
    messageI18n: t('ERR_CAMERA_NOT_AUTHORIZED'),
  },
  [TUIErrorCode.ERR_CAMERA_OCCUPIED]: {
    code:-1102,
    messageI18n: t('ERR_CAMERA_OCCUPIED'),
  },
  [TUIErrorCode.ERR_CAMERA_DEVICE_EMPTY]: {
    code:-1103,
    messageI18n: t('ERR_CAMERA_DEVICE_EMPTY'),
  },
  [TUIErrorCode.ERR_MICROPHONE_START_FAILED]: {
    code:-1104,
    messageI18n: t('ERR_MICROPHONE_START_FAILED'),
  },
  [TUIErrorCode.ERR_MICROPHONE_NOT_AUTHORIZED]: {
    code:-1105,
    messageI18n: t('ERR_MICROPHONE_NOT_AUTHORIZED'),
  },
  [TUIErrorCode.ERR_MICROPHONE_OCCUPIED]: {
    code:-1106,
    messageI18n: t('ERR_MICROPHONE_OCCUPIED'),
  },
  [TUIErrorCode.ERR_MICROPHONE_DEVICE_EMPTY]: {
    code:-1107,
    messageI18n: t('ERR_MICROPHONE_DEVICE_EMPTY'),
  },
  [TUIErrorCode.ERR_GET_SCREEN_SHARING_TARGET_FAILED]: {
    code:-1108,
    messageI18n: t('ERR_GET_SCREEN_SHARING_TARGET_FAILED'),
  },
  [TUIErrorCode.ERR_START_SCREEN_SHARING_FAILED]: {
    code:-1109,
    messageI18n: t('ERR_START_SCREEN_SHARING_FAILED'),
  },
  [TUIErrorCode.ERR_ALREADY_ROOM_OWNER]: {
    code:-1200,
    messageI18n: t('ERR_ALREADY_ROOM_OWNER'),
  },
  [TUIErrorCode.ERR_IM_ATTRIBUTE_WRITE_CONFLICT]: {
    code:-1201,
    messageI18n: t('ERR_IM_ATTRIBUTE_WRITE_CONFLICT'),
  },
  [TUIErrorCode.ERR_ALREADY_ROOM_ENTER]: {
    code:-1202,
    messageI18n: t('ERR_ALREADY_ROOM_ENTER'),
  },
  [TUIErrorCode.ERR_DESTROY_ROOM_NO_PERMISSION]: {
    code:-1203,
    messageI18n: t('ERR_DESTROY_ROOM_NO_PERMISSION'),
  },
  [TUIErrorCode.ERR_LIVE_REQUEST_SERVER_TIMEOUT]: {
    code:-1300,
    messageI18n: t('ERR_LIVE_REQUEST_SERVER_TIMEOUT'),
  },
  [TUIErrorCode.ERR_LIVE_SERVER_PROCESS_FAILED]: {
    code:-1301,
    messageI18n: t('ERR_LIVE_SERVER_PROCESS_FAILED'),
  },
  [TUIErrorCode.ERR_LIVE_DISCONNECTED]: {
    code:-1302,
    messageI18n: t('ERR_LIVE_DISCONNECTED'),
  },
  [TUIErrorCode.ERR_LIVE_NO_AVAILABLE_HEVC_DECODERS]: {
    code:-1303,
    messageI18n: t('ERR_LIVE_NO_AVAILABLE_HEVC_DECODERS'),
  },
  [TUIErrorCode.ERR_OPERATION_INVALID_BEFORE_ENTER_ROOM]: {
    code:-2101,
    messageI18n: t('ERR_OPERATION_INVALID_BEFORE_ENTER_ROOM'),
  },
  [TUIErrorCode.ERR_EXIT_NOT_SUPPORTED_FOR_ROOM_OWNER]: {
    code:-2102,
    messageI18n: t('ERR_EXIT_NOT_SUPPORTED_FOR_ROOM_OWNER'),
  },
  [TUIErrorCode.ERR_OPERATION_NOT_SUPPORTED_IN_CURRENT_ROOM_TYPE]: {
    code:-2103,
    messageI18n: t('ERR_OPERATION_NOT_SUPPORTED_IN_CURRENT_ROOM_TYPE'),
  },
  [TUIErrorCode.ERR_ROOM_ID_INVALID]: {
    code:-2105,
    messageI18n: t('ERR_ROOM_ID_INVALID'),
  },
  [TUIErrorCode.ERR_ROOM_NAME_INVALID]: {
    code:-2107,
    messageI18n: t('ERR_ROOM_NAME_INVALID'),
  },
  [TUIErrorCode.ERR_ALREADY_IN_OTHER_ROOM]: {
    code:-2108,
    messageI18n: t('ERR_ALREADY_IN_OTHER_ROOM'),
  },
  [TUIErrorCode.ERR_USER_NOT_EXIST]: {
    code:-2200,
    messageI18n: t('ERR_USER_NOT_EXIST'),
  },
  [TUIErrorCode.ERR_NEED_OWNER_PERMISSION]: {
    code:-2300,
    messageI18n: t('ERR_NEED_OWNER_PERMISSION'),
  },
  [TUIErrorCode.ERR_NEED_ADMIN_PERMISSION]: {
    code:-2301,
    messageI18n: t('ERR_NEED_ADMIN_PERMISSION'),
  },
  [TUIErrorCode.ERR_REQUEST_NO_PERMISSION]: {
    code:-2310,
    messageI18n: t('ERR_REQUEST_NO_PERMISSION'),
  },
  [TUIErrorCode.ERR_REQUEST_ID_INVALID]: {
    code:-2311,
    messageI18n: t('ERR_REQUEST_ID_INVALID'),
  },
  [TUIErrorCode.ERR_REQUEST_ID_REPEAT]: {
    code:-2312,
    messageI18n: t('ERR_REQUEST_ID_REPEAT'),
  },
  [TUIErrorCode.ERR_MAX_SEAT_COUNT_LIMIT]: {
    code:-2340,
    messageI18n: t('ERR_MAX_SEAT_COUNT_LIMIT'),
  },
  [TUIErrorCode.ERR_SEAT_INDEX_NOT_EXIST]: {
    code:-2344,
    messageI18n: t('ERR_SEAT_INDEX_NOT_EXIST'),
  },
  [TUIErrorCode.ERR_OPEN_MICROPHONE_NEED_SEAT_UNLOCK]: {
    code:-2360,
    messageI18n: t('ERR_OPEN_MICROPHONE_NEED_SEAT_UNLOCK'),
  },
  [TUIErrorCode.ERR_OPEN_MICROPHONE_NEED_PERMISSION_FROM_ADMIN]: {
    code:-2361,
    messageI18n: t('ERR_OPEN_MICROPHONE_NEED_PERMISSION_FROM_ADMIN'),
  },
  [TUIErrorCode.ERR_OPEN_CAMERA_NEED_SEAT_UNLOCK]: {
    code:-2370,
    messageI18n: t('ERR_OPEN_CAMERA_NEED_SEAT_UNLOCK'),
  },
  [TUIErrorCode.ERR_OPEN_CAMERA_NEED_PERMISSION_FROM_ADMIN]: {
    code:-2371,
    messageI18n: t('ERR_OPEN_CAMERA_NEED_PERMISSION_FROM_ADMIN'),
  },
  [TUIErrorCode.ERR_OPEN_SCREEN_SHARE_NEED_SEAT_UNLOCK]: {
    code:-2372,
    messageI18n: t('ERR_OPEN_SCREEN_SHARE_NEED_SEAT_UNLOCK'),
  },
  [TUIErrorCode.ERR_OPEN_SCREEN_SHARE_NEED_PERMISSION_FROM_ADMIN]: {
    code:-2373,
    messageI18n: t('ERR_OPEN_SCREEN_SHARE_NEED_PERMISSION_FROM_ADMIN'),
  },
  [TUIErrorCode.ERR_SEND_MESSAGE_DISABLED_FOR_ALL]: {
    code:-2380,
    messageI18n: t('ERR_SEND_MESSAGE_DISABLED_FOR_ALL'),
  },
  [TUIErrorCode.ERR_SEND_MESSAGE_DISABLED_FOR_CURRENT]: {
    code:-2381,
    messageI18n: t('ERR_SEND_MESSAGE_DISABLED_FOR_CURRENT'),
  },
  [TUIErrorCode.ERR_ROOM_NOT_SUPPORT_PRELOADING]: {
    code: -4001,
    messageI18n: t('ERR_ROOM_NOT_SUPPORT_PRELOADING'),
  },
  [TUIErrorCode.ERR_CALL_IN_PROGRESS]: {
    code: -6001,
    messageI18n: t('ERR_CALL_IN_PROGRESS'),
  },
  [TUIErrorCode.ERR_SERVER_SYSTEM_ERROR]: {
    code: 100001,
    messageI18n: t('ERR_SERVER_SYSTEM_ERROR'),
  },
  [TUIErrorCode.ERR_SERVER_INVALID_PARAMETER]: {
    code: 100002,
    messageI18n: t('ERR_SERVER_INVALID_PARAMETER'),
  },
  [TUIErrorCode.ERR_ROOM_ID_OCCUPIED]: {
    code:100003,
    messageI18n: t('ERR_ROOM_ID_OCCUPIED'),
  },
  [TUIErrorCode.ERR_ROOM_ID_NOT_EXIST]: {
    code:100004,
    messageI18n: t('ERR_ROOM_ID_NOT_EXIST'),
  },
  [TUIErrorCode.ERR_USER_NOT_ENTERED]: {
    code:100005,
    messageI18n: t('ERR_USER_NOT_ENTERED'),
  },
  [TUIErrorCode.ERR_NO_PERMISSION]: {
    code:100006,
    messageI18n: t('ERR_NO_PERMISSION'),
  },
  [TUIErrorCode.ERR_NEED_PASSWORD]: {
    code:100018,
    messageI18n: t('ERR_NEED_PASSWORD'),
  },
  [TUIErrorCode.ERR_WRONG_PASSWORD]: {
    code:100019,
    messageI18n: t('ERR_WRONG_PASSWORD'),
  },
  [TUIErrorCode.ERR_ROOM_USER_FULL]: {
    code:100008,
    messageI18n: t('ERR_ROOM_USER_FULL'),
  },
  [TUIErrorCode.ERR_REQUEST_CONFLICT]: {
    code:100102,
    messageI18n: t('ERR_REQUEST_CONFLICT'),
  },
  [TUIErrorCode.ERR_SEAT_OCCUPIED]: {
    code:100210,
    messageI18n: t('ERR_SEAT_OCCUPIED'),
  },
  [TUIErrorCode.ERR_ALREADY_IN_SEAT]: {
    code:100203,
    messageI18n: t('ERR_ALREADY_IN_SEAT'),
  },
  [TUIErrorCode.ERR_SEAT_LOCKED]: {
    code:100200,
    messageI18n: t('ERR_SEAT_LOCKED'),
  },
  [TUIErrorCode.ERR_ALL_SEAT_OCCUPIED]: {
    code:100205,
    messageI18n: t('ERR_ALL_SEAT_OCCUPIED'),
  },
  [TUIErrorCode.ERR_USER_NOT_IN_SEAT]: {
    code:100206,
    messageI18n: t('ERR_USER_NOT_IN_SEAT'),
  },
  [TUIErrorCode.ERR_SEAT_NOT_SUPPORT_LINK_MIC]: {
    code:100211,
    messageI18n: t('ERR_SEAT_NOT_SUPPORT_LINK_MIC'),
  },
  [TUIErrorCode.ERR_ROOM_ALREADY_CONNECTED]: {
    code:100401,
    messageI18n: t('ERR_ROOM_ALREADY_CONNECTED'),
  },
  [TUIErrorCode.ERR_ROOM_CONNECTED_IN_OTHER]: {
    code:100403,
    messageI18n: t('ERR_ROOM_CONNECTED_IN_OTHER'),
  },
  [TUIErrorCode.ERR_MAX_CONNECTED_COUNT_LIMIT]: {
    code:100404,
    messageI18n: t('ERR_MAX_CONNECTED_COUNT_LIMIT'),
  },
  [TUIErrorCode.ERR_BATTLE_IN_RUNNING]: {
    code:100419,
    messageI18n: t('ERR_BATTLE_IN_RUNNING'),
  },
  [TUIErrorCode.ERR_BATTLE_ID_NOT_EXIST]: {
    code:100411,
    messageI18n: t('ERR_BATTLE_ID_NOT_EXIST'),
  },
  [TUIErrorCode.ERR_ROOM_BATTLEID_IN_OTHER]: {
    code:100415,
    messageI18n: t('ERR_ROOM_BATTLEID_IN_OTHER'),
  },
  [TUIErrorCode.ERR_ROOM_METADATA_EXCEED_KEY_COUNT_LIMIT]: {
    code:100500,
    messageI18n: t('ERR_ROOM_METADATA_EXCEED_KEY_COUNT_LIMIT'),
  },
  [TUIErrorCode.ERR_ROOM_METADATA_EXCEED_VALUE_SIZE_LIMIT]: {
    code:100501,
    messageI18n: t('ERR_ROOM_METADATA_EXCEED_VALUE_SIZE_LIMIT'),
  },
  [TUIErrorCode.ERR_GIFT_ABILITY_NOT_ENABLED]: {
    code: 102001,
    messageI18n: t('ERR_GIFT_ABILITY_NOT_ENABLED'),
  },
  [TUIErrorCode.ERR_GIFT_NOT_EXIST]: {
    code: 102002,
    messageI18n: t('ERR_GIFT_NOT_EXIST'),
  },
  [TUIErrorCode.ERR_GIFT_SERVER_PRE_VERIFICATION_FAILED]: {
    code: 102004,
    messageI18n: t('ERR_GIFT_SERVER_PRE_VERIFICATION_FAILED'),
  },
  [TUIErrorCode.ERR_MIX_STREAM_UPDATE_TOO_FREQ]: {
    code: 100427,
    messageI18n: t('ERR_FREQ_LIMIT'),
  },
  [TUIErrorCode.ERR_PUBLISH_STREAM_INFO_NOT_EXISTED]: {
    code: 100430,
    messageI18n: t('ERR_PUBLISH_STREAM_INFO_NOT_EXISTED'),
  },
  [TUIErrorCode.ERR_PUBLISH_STREAM_NO_NEED_RECOVERY]: {
    code: 100431,
    messageI18n: t('ERR_PUBLISH_STREAM_NO_NEED_RECOVERY'),
  },
}

export function onError(error: any) {
  if (error.code !== null && error.code !== undefined) {
    const { code } = error;
    if (RoomErrorInfo[code]) {
      if (code !== 0) {
        logger.warn(`${logPrefix}onError:`, error);
        if (RoomErrorInfo[code].messageI18n) {
          TUIMessageBox({
            title: t('Note'),
            message: RoomErrorInfo[code].messageI18n,
            confirmButtonText: t('Sure'),
          });
        }
      } else {
        // code 0 is successful, do nothing
      }
    } else {
      logger.warn(`${logPrefix}onError:`, error);
    }
  } else {
    logger.warn(`${logPrefix}onError:`, error);
  }
}

function useErrorHandler() {
  onBeforeMount(() => {
    window.addEventListener('error', onError);
  });

  onUnmounted(() => {
    window.removeEventListener('error', onError);
  });

  return {
    onError,
  }
}

export default useErrorHandler;
