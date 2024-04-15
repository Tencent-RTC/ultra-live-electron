import { getAppPath } from './envUtils';
import i18n from '../locales';
import NoBeautyIcon from '../common/icons/NoBeautyIcon.vue';
import DermabrasionBeautyIcon from '../common/icons/DermabrasionBeautyIcon.vue';
import WhitenBeautyIcon from '../common/icons/WhitenBeautyIcon.vue';
import FloridBeautyIcon from '../common/icons/FloridBeautyIcon.vue';
import SlimmingBeautyIcon from '../common/icons/SlimmingBeautyIcon.vue';
import ShapeBeautyIcon from '../common/icons/ShapeBeautyIcon.vue';
import ShortBeautyIcon from '../common/icons/ShortBeautyIcon.vue';
import VShapeBeautyIcon from '../common/icons/VShapeBeautyIcon.vue';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const { platform, arch } = process;
const { t } = i18n.global;
const TUIBeautyResourceBasePath = getResourcePath();
const TUIBeautyPluginLibPath = getPluginDLLPath();

// 获取美颜资源文件路径
function getResourcePath() {
  let path = '';
  if (platform === "win32") {
    path = "plugin/XMagic/win/res/";
  } else if (platform === "darwin") {
    // macos
    path = "plugin/XMagic/mac/resources/";
  } else {
    console.error(`XMagic not support "${platform}"`);
  }

  console.log("[constant]getResourcePath:", path);
  return path;
}
  
// 获取美颜插件库地址
function getPluginDLLPath() {
  let path = '';
  if (platform === "win32") {
    if (arch === "x64") {
      path = "plugin/XMagic/win/x64/TRTCElectronXmagicBeautyPlugin.dll";
    } else {
      // ia32
      path = "plugin/XMagic/win/ia32/TRTCElectronXmagicBeautyPlugin.dll";
    }
  } else if (platform === "darwin"){
    path = "plugin/XMagic/mac/XmagicMac.dylib";
  } else {
    console.error(`XMagic not support "${platform}"`);
  }

  console.log("[constant]getPluginDLLPath:", path);
  return path;
}

// 获取美颜插件库文件路径
export async function getBeautyPluginLibPath() {
  const appPath = await getAppPath();
  console.log(
    "[constant]getBeautyPluginLibPath path:",
    window.path,
    " appPath:",
    appPath
  );
  const libPath = window.path.resolve(appPath, TUIBeautyPluginLibPath);
  console.warn("[constant]getBeautyPluginLibPath path:", libPath);
  return libPath;
}

// 获取美颜初始化参数：认证信息和资源目录文件
export async function getBeautyInitParam() {
  const appPath = await getAppPath();
  const initParam = {
    licenseURL: "",
    licenseKey: "",
    resPath: window.path
      .join(appPath, TUIBeautyResourceBasePath)
      .replaceAll("\\", "/"),
  };
  return initParam;
}

export enum TUIBeautyCategory {
  Beauty = 0, // 美颜
  BodyBeauty = 1, // 美体
  Lut = 2, // 滤镜
  Motion = 3, // 动效
  Segmentation = 4, // 扣背
  Makeup = 5, // 化妆
}

export type TUIBeautyProperty = {
  category?: TUIBeautyCategory;
  effKey: string;
  effValue?: string;
  resPath?: string;
  imgPath?: string;
  bgPath?: string;
  label?: string;
}

// 一键美颜
export const TUISimpleBeautyConstant = {
  /// 不使用
  NON_USE: {
    label: t('Non-use'),
  },
  /// 轻度美颜
  LIGHT_BEAUTY: {
    label: t('Light Beauty'),
  },
  /// 中度美颜
  MEDIUM_BEAUTY: {
    label: t('Medium Beauty'),
  },
  /// 重度美颜
  EXTREME_BEAUTY: {
    label: t('Extreme Beauty'),
  }
}

// 美颜参数常量：基础参数，参数取值范围 0 - 1
export const TUIBasicBeautyConstant = {
  /// 不使用
  NON_USE: {
    label: t('Non-use'),
    icon: NoBeautyIcon,
  },
  /// 美白 whiten
  BEAUTY_WHITEN: {
    effKey: "beauty.lutFoundationAlpha",
    effValue: '0',
    label: t('Whiten'),
    icon: WhitenBeautyIcon,
  },
  /// 磨皮 smooth
  BEAUTY_SMOOTH: {
    effKey: "smooth.smooth",
    effValue: '0',
    label: t('Dermabrasion'),
    icon: DermabrasionBeautyIcon,
  },
  ///红润 rosy
  BEAUTY_ROSY: {
    effKey: "smooth.rosy",
    effValue: '0',
    label: t('Florid'),
    icon: FloridBeautyIcon,
  },
};

// 美颜参数常量：人像美颜，参数取值范围 0 - 1
export const TUIFaceBeautyConstant = {
  ///瘦脸/自然 thin face - nature
  BEAUTY_FACE_NATURE: {
    effKey: "basicV7.natureFace",
    effValue: '0',
    label: t('Slimming'),
    icon: SlimmingBeautyIcon,
  },
  ///脸型 face style
  BEAUTY_FACE_BASIC: {
    effKey: "liquefaction.basic3",
    effValue: '0',
    label: t('Shape of face'),
    icon: ShapeBeautyIcon,
  },
  ///短脸 short face
  BEAUTY_FACE_SHORT: {
    effKey: "basicV7.shortFace",
    effValue: '0',
    label: t('Short face'),
    icon: ShortBeautyIcon,
  },
  ///V脸 V face
  BEAUTY_FACE_V: {
    effKey: "basicV7.vFace",
    effValue: '0',
    label: t('V-shaped face'),
    icon: VShapeBeautyIcon,
  },
};

// 美体参数常量，参数取值范围 0 - 1
export const TUIBodyBeautyConstant = {
  /// 一键瘦身 auto slimming
  BODY_AUTOTHIN_BODY_STRENGTH: {
    effKey: "body.autothinBodyStrength",
    label: "一键瘦身",
  },
  /// 小头 slim head
  BODY_SLIM_HEAD_STRENGTH: {
    effKey: "body.slimHeadStrength",
    label: "小头",
  },
  /// 瘦肩 thin shoulder
  BODY_THIN_SHOULDER_STRENGTH: {
    effKey: "body.thinShoulderStrength",
    label: "瘦肩",
  },
  /// 瘦腰 thin waist
  BODY_WAIST_STRENGTH: {
    effKey: "body.waistStrength",
    label: "瘦腰",
  },
  /// 瘦腿 slim leg
  BODY_SLIM_LEG_STRENGTH: {
    effKey: "body.slimLegStrength",
    label: "瘦腿",
  },
  /// 长腿 leg stretch
  BODY_LEG_STRETCH: {
    effKey: "body.legStretch",
    label: "长腿",
  },
};

// 动效参数常量
const TUIMotionBeautyConstant: Record<string, TUIBeautyProperty>= {
  empty: {
    effKey: "naught",
    resPath: platform === "win32" ? "LightCore.bundle/template.json" : "2dMotionRes.bundle",
    imgPath: "",
  },
  video_keaituya: {
    effKey: "video_keaituya",
    resPath: platform === "win32" ? "2dMotionRes.bundle/video_keaituya/template.json" : "2dMotionRes.bundle",
    imgPath:
      "./plugin/XMagic/res/2dMotionRes.bundle/video_keaituya/template.png",
  },
  video_tutujiang: {
    effKey: "video_tutujiang",
    resPath: platform === "win32" ? "2dMotionRes.bundle/video_tutujiang/template.json" : "2dMotionRes.bundle",
    imgPath:
      "./plugin/XMagic/res/2dMotionRes.bundle/video_tutujiang/template.png",
  },
  video_zhixingmeigui: {
    effKey: "video_zhixingmeigui",
    resPath: platform === "win32" ? "3dMotionRes.bundle/video_zhixingmeigui/template.json" : "3dMotionRes.bundle",
    imgPath:
      "./plugin/XMagic/res/3dMotionRes.bundle/video_zhixingmeigui/template.png",
  },
  video_bubblegum: {
    effKey: "video_bubblegum",
    resPath: platform === "win32" ? "ganMotionRes.bundle/video_bubblegum/template.json" : "ganMotionRes.bundle",
    imgPath:
      "./plugin/XMagic/res/ganMotionRes.bundle/video_bubblegum/template.png",
  },
  video_sakuragirl: {
    effKey: "video_sakuragirl",
    resPath: platform === "win32" ? "handMotionRes.bundle/video_sakuragirl/template.json" : "handMotionRes.bundle",
    imgPath:
      "./plugin/XMagic/res/handMotionRes.bundle/video_sakuragirl/template.png",
  },
};

// 动效参数常量中，相对路径转为绝对路径
let hasGeneratedFullPath4Motion = false;
export async function getTUIMotionBeautyConstant() {
  const appPath = await getAppPath();

  if (hasGeneratedFullPath4Motion) {
    return TUIMotionBeautyConstant;
  }

  Reflect.ownKeys(TUIMotionBeautyConstant).forEach((key) => {
    const item = TUIMotionBeautyConstant[key as string];
    if (item.resPath) {
      item.resPath = window.path
        .join(appPath, TUIBeautyResourceBasePath, item.resPath)
        .replaceAll("\\", "/");
    }
  });
  hasGeneratedFullPath4Motion = true;
  return TUIMotionBeautyConstant;
}

// 虚拟背景、背景虚化参数常量
const TUISegmentationConstant: Record<string, TUIBeautyProperty>= { 
  // empty: {
  //   effKey: "naught",
  //   resPath: platform === "win32" ? "LightCore.bundle/template.json" : "segmentMotionRes.bundle",
  //   imgPath: "",
  //   bgPath: "",
  // },
  // blur: {
  //   effKey: "video_segmentation_blur",
  //   resPath: platform === "win32" ? "segmentMotionRes.bundle/video_segmentation_blur/template.json" : "segmentMotionRes.bundle",
  //   imgPath: "",
  //   bgPath: "",
  // },
  黑板: {
    effKey: "video_empty_segmentation",
    resPath: platform === "win32" ? "segmentMotionRes.bundle/video_empty_segmentation/template.json" : "segmentMotionRes.bundle",
    imgPath: "./virtual-bg/黑板.jpg",
    bgPath: "",
    label: t('Blackboards'),
  },
};

// 虚拟背景、背景虚化参数常量中，相对路径转为绝对路径
let hasGeneratedFullPath4Segmentation = false;
export async function getTUISegmentationBeautyConstant() {
  const appPath = await getAppPath();

  if (hasGeneratedFullPath4Segmentation) {
    return TUISegmentationConstant;
  }

  Reflect.ownKeys(TUISegmentationConstant).forEach((key) => {
    const item = TUISegmentationConstant[key as string];
    if (item.resPath) {
      item.resPath = window.path
        .join(appPath, TUIBeautyResourceBasePath, item.resPath)
        .replaceAll("\\", "/");
    }
    if (item.imgPath) {
      if (location.href.startsWith("http")) {
        // development
        item.bgPath = window.path
          .join(appPath, "/public", item.imgPath)
          .replaceAll("\\", "/");
      } else {
        // production
        item.bgPath = window.path
          .join(appPath, "/dist", item.imgPath)
          .replaceAll("\\", "/");
      }
    }
  });
  hasGeneratedFullPath4Segmentation = true;
  return TUISegmentationConstant;
}

// --------------------------------------------- 以下内容的所有美颜参数尚不支持 -----------------------------
export const BeautyConstant = {
  //////////////////////////////////////////////////effkey 定义
  ///口红 lipstick
  BEAUTY_MOUTH_LIPSTICK: {
    effKey: "beauty.faceFeatureLipsLut",
    label: "口红",
  },
  ///立体 soft light
  BEAUTY_FACE_SOFTLIGHT: {
    effKey: "beauty.faceFeatureSoftlight",
    label: "立体",
  },
  ///腮红 face blush
  BEAUTY_FACE_RED_CHEEK: {
    effKey: "beauty.faceFeatureRedCheek",
    label: "腮红",
  },

  //   /// 美妆的effkey
  //   MAKEUP_EFF_KEY = "makeup.strength",

  //////////////////////////////////////////////////id 定义
  // ///自然 thin face - nature
  // BEAUTY_FACE_NATURE_ID = "nature",
  // ///女神 thin face - goddess
  // BEAUTY_FACE_FEMALE_GOD_ID = "femaleGod",
  // ///英俊 thin face - handsome
  // BEAUTY_FACE_MALE_GOD_ID = "maleGod",

  // /// 口红id
  // BEAUTY_LIPS_LIPS_MASK_ID = "beauty.faceFeatureLipsLut",
  // // --复古红
  // beauty.lips.lipsMask = images/beauty/lips_fuguhong.png
  // beauty.lips.lipsType = 2
  // // --蜜桃色
  // beauty.lips.lipsMask = images/beauty/lips_mitaose.png
  // beauty.lips.lipsType = 2
  // // --珊瑚橘
  // beauty.lips.lipsMask = images/beauty/lips_shanhuju.png
  // beauty.lips.lipsType = 2
  // // --温柔粉
  // beauty.lips.lipsMask = images/beauty/lips_wenroufen.png
  // beauty.lips.lipsType = 2
  // //  --活力橙
  // beauty.lips.lipsMask = images/beauty/lips_huolicheng.png
  // beauty.lips.lipsType = 2

  // /// 腮红id
  // BEAUTY_MAKEUP_MULTIPLY_MULTIPLY_MASK_ID = "beauty.faceFeatureRedCheek",
  // // --简约
  // beauty.makeupMultiply.multiplyMask = images/beauty/saihong_jianyue.png
  // // --盛夏
  // beauty.makeupMultiply.multiplyMask = images/beauty/saihong_shengxia.png
  // // --害羞
  // beauty.makeupMultiply.multiplyMask = images/beauty/saihong_haixiu.png
  // // --成熟
  // beauty.makeupMultiply.multiplyMask = images/beauty/saihong_chengshu.png
  // // --雀斑
  // beauty.makeupMultiply.multiplyMask = images/beauty/saihong_queban.png

  // /// 立体 id
  // static const  String BEAUTY_SOFTLIGHT_SOFTLIGHT_MASK_ID = "beauty.faceFeatureSoftlight",
  // // --俊朗
  // beauty.softLight.softLightMask = images/beauty/liti_junlang.png
  // // --自然
  // beauty.softLight.softLightMask = images/beauty/liti_ziran.png
  // // --光芒
  // beauty.softLight.softLightMask = images/beauty/liti_guangmang.png
  // // --清新
  // beauty.softLight.softLightMask = images/beauty/liti_qingxin.png
};
