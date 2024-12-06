<template>
  <div class="tui-beauty-panel">
    <div class="tui-form" v-show="currentBeautyProperty.minValue !== undefined">
      <span class="tui-form-label">{{ currentBeautyProperty.label }}</span>
      <input 
        class="tui-form-range"
        type="range"
        :min="currentBeautyProperty.minValue"
        :max="currentBeautyProperty.maxValue"
        :value="currentBeautyProperty.effValue" 
        @input="onChangeBeautyValue" />
      <span class="tui-form-value">{{ currentBeautyProperty.effValue }}</span>
    </div>
    <div class="tui-beauty-tabs">
      <div class="tui-beauty-tabs-header" @click="onChangeTab">
        <button
          v-for="(item, key) in beautyEffectConstants" 
          :key="key" 
          :data-name="item.label"
          class="tui-tab-nav-button" 
          :class="{'is-active': item.label === activeName}
        ">
          {{ item.label }}
        </button>
      </div>
      <div class="tui-beauty-tabs-panels">
        <div v-show="activeName === beautyEffectConstants.beauty.label" class="tui-tab-panel">
          <ul class="tui-beauty-property-list">
            <li
              v-for="(item) in beautyEffectConstants.beauty.details" 
              :key="item.label"
              class="tui-beauty-property-item"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleBasicBeautyPropertyClick(item)"
            >
              <img :src="item.icon" alt=""  class="tui-beauty-property-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.imageQuality.label" class="tui-tab-panel">
          <ul class="tui-beauty-property-list">
            <li 
              v-for="(item) in beautyEffectConstants.imageQuality.details" 
              :key="item.label"
              class="tui-beauty-property-item"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleImageQualityClick(item)"
            >
              <img :src="item.icon" alt="" class="tui-beauty-property-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.advancedBeauty.label" class="tui-tab-panel">
          <ul class="tui-beauty-property-list">
            <li
              v-for="(item) in beautyEffectConstants.advancedBeauty.details" 
              :key="item.label"
              class="tui-beauty-property-item"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleAdvancedBeautyPropertyClick(item)"
            >
              <img :src="item.icon" alt=""  class="tui-beauty-property-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.bodyBeauty.label" class="tui-tab-panel">
          <ul class="tui-beauty-property-list">
            <li
              v-for="(item) in beautyEffectConstants.bodyBeauty.details" 
              :key="item.label"
              class="tui-beauty-property-item"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleBodyBeautyPropertyClick(item)"
            >
              <img :src="item.icon" alt=""  class="tui-beauty-property-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.makeup.label" class="tui-tab-panel">
          <div
            v-for="(item) in beautyEffectConstants.makeup.details" 
            :key="item.label"
            class="tui-beauty-property-grpup"
            >
            <div>{{ item.label }}</div>
            <ul class="tui-beauty-property-list">
              <li
                v-for="(option) in item.options" 
                :key="option.label"
                class="tui-beauty-property-item"
                :class="{'is-active': option.isSelected}"
                :title="option.label"
                @click="handleMakeupClick(option, item)"
              >
                <img :src="option.icon" alt=""  class="tui-beauty-property-image"/>
                <div class="tui-beauty-label">{{ option.label }}</div>
              </li>
            </ul>
          </div>
        </div>
        <div v-show="activeName === beautyEffectConstants.advancedMakeup.label" class="tui-tab-panel">
          <ul class="tui-beauty-property-list">
            <li
              v-for="(item) in beautyEffectConstants.advancedMakeup.details" 
              :key="item.label"
              class="tui-beauty-property-item"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleAdvancedMakeupClick(item)"
            >
              <img :src="item.icon" alt=""  class="tui-beauty-property-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.lut.label" class="tui-tab-panel">
          <ul class="tui-beauty-property-list">
            <li
              v-for="(item) in beautyEffectConstants.lut.details" 
              :key="item.label"
              class="tui-beauty-property-item"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleLutClick(item)"
            >
              <img :src="item.icon" alt=""  class="tui-beauty-property-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.motion.label" class="tui-tab-panel tui-no-form">
          <ul class="tui-beauty-property-list">
            <template
              v-for="(item) in beautyEffectConstants.motion.details"
              :key="item.label"
            >
              <li
                v-for="(option) in item.details" 
                :key="option.label"
                class="tui-beauty-property-item"
                :class="{'is-active': option.isSelected}"
                :title="option.label"
                @click="handleMotionClick(option)"
              >
                <img :src="option.icon" alt=""  class="tui-beauty-property-image"/>
                <div class="tui-beauty-label">{{ option.label }}</div>
              </li>
            </template>
          </ul>
        </div>
        <div v-show="activeName === beautyEffectConstants.segment.label" class="tui-tab-panel tui-no-form">
          <ul class="tui-beauty-property-list">
            <li
              v-for="(item) in beautyEffectConstants.segment.details" 
              :key="item.label"
              class="tui-beauty-property-item tui-beauty-property-item-backgound"
              :class="{'is-active': item.isSelected}"
              :title="item.label"
              @click="handleSegmentClick(item)"
            >
              <img :src="item.icon" alt=""  class="tui-beauty-property-image tui-virtual-image"/>
              <div class="tui-beauty-label">{{ item.label }}</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { customEffectConstant, TRTCXmagicEffectCategory, TRTCXmagicFactory } from '../utils/beauty';

export default {
  data() {
    return {
      activeName: "",
      beautyEffectConstants: {},
      currentBeautyProperty: {},
      progressElement: null
    };
  },
  props: {
    initValue: {
      require: false,
      type: Array,
    }
  },
  computed: {
    beautyTypes: (state) => Object.keys(state.beautyEffectConstants).map(key => state.beautyEffectConstants[key].label),
  },
  methods: {
    onChangeBeautyValue(event) {
      const { value } = event.target;
      console.log('onChangeBeautyValue', value);

      this.currentBeautyProperty.effValue = Number(value);
      this.setProgress(this.currentBeautyProperty.effValue);
      let effectProperties = [];
      if (this.currentBeautyProperty.category !== TRTCXmagicEffectCategory.Makeup) {
        effectProperties = TRTCXmagicFactory.buildEffectProperty(this.currentBeautyProperty);
      } else {
        effectProperties = TRTCXmagicFactory.buildMakeupEffectProperty(this.currentBeautyProperty);
      }
      if (effectProperties?.length) {
        console.log('onChangeBeautyValue effect property:', effectProperties);
        this.$emit('on-change', effectProperties);
      }
    },
    onChangeTab(event) {
      console.log('onChangeTab', event, this.beautyTypes);
      const target = event.target;
      if (target && target.dataset.name) {
        const name = target.dataset.name;
        if (this.beautyTypes.indexOf(name) !== -1) {
          this.activeName = name;
          this.currentBeautyProperty = {};
        } else {
          console.warn('onChangeTab invalid tab name:', name);
        }
      }
    },
    setProgress(progress){
      if(!this.progressElement)return;
      const diffValue = this.currentBeautyProperty.maxValue - this.currentBeautyProperty.minValue;
      if(diffValue !== 100) {
        progress = (progress + diffValue - 100)/2;
      }
      this.progressElement.style.setProperty("--slider-filled-width", `${progress}%`)
    },
    handleBasicBeautyPropertyClick(item) {
      console.log('handleBasicBeautyPropertyClick', item);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      this.beautyEffectConstants.beauty.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });
    },
    handleImageQualityClick(item) {
      console.log('handleImageQualityClick', item);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      this.beautyEffectConstants.imageQuality.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });
    },
    handleAdvancedBeautyPropertyClick(item) {
      console.log('handleAdvancedBeautyPropertyClick', item);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      this.beautyEffectConstants.advancedBeauty.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });
    },
    handleBodyBeautyPropertyClick(item) {
      console.log('handleBodyBeautyPropertyClick', item);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      this.beautyEffectConstants.bodyBeauty.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });
    },
    handleMakeupClick(item, parentItem) {
      console.log('handleMakeupClick', item, parentItem);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      parentItem.options.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else { 
          option.isSelected = true;
        }
      });
    },
    handleAdvancedMakeupClick(item) {
      console.log('handleAdvancedMakeupClick', item);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      this.beautyEffectConstants.advancedMakeup.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });

      const effectProperties = TRTCXmagicFactory.buildEffectProperty(item);
      if (effectProperties?.length) {
        console.log('handleAdvancedMakeupClick effect property:', effectProperties);
        this.$emit('on-change', effectProperties);
      }
    },
    handleLutClick(item) {
      console.log('handleLutClick', item);
      this.currentBeautyProperty = item;
      this.setProgress(item.effValue);
      this.beautyEffectConstants.lut.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });
      if (item.minValue === undefined) {
        const effectProperties = TRTCXmagicFactory.buildEffectProperty(item);
        if (effectProperties?.length) {
          console.log('handleLutClick effect property:', effectProperties);
          this.$emit('on-change', effectProperties);
        }
      }
    },
    handleMotionClick(item) {
      console.log('handleMotionClick', item);
      const effectProperties = TRTCXmagicFactory.buildEffectProperty(item);
      if (effectProperties?.length) {
        console.log('handleMotionClick effect property:', effectProperties);
        this.$emit('on-change', effectProperties);
      }

      this.beautyEffectConstants.motion.details.forEach(groupItem => {
        groupItem.details.forEach(option => {
          if (option.label !== item.label) {
            option.isSelected = false;
          } else {
            option.isSelected = true;
          }
        })
      });
    },
    handleSegmentClick(item) {
      console.log('handleSegmentClick', item);
      const effectProperties = TRTCXmagicFactory.buildEffectProperty(item);
      if (effectProperties?.length) {
        console.log('handleSegmentClick effect property:', effectProperties);
        this.$emit('on-change', effectProperties);
      }

      this.beautyEffectConstants.segment.details.forEach(option => {
        if (option.label !== item.label) {
          option.isSelected = false;
        } else {
          option.isSelected = true;
        }
      });
    }
  },
  mounted(){
    this.progressElement = document.querySelector(".tui-form-range");
  },
  created() {
    let beautyEffectConstants;
    if (this.initValue?.length) {
      beautyEffectConstants = TRTCXmagicFactory.getEffectConstant(customEffectConstant, this.initValue);
    } else {
      beautyEffectConstants = TRTCXmagicFactory.getEffectConstant(customEffectConstant);
    }
    this.beautyEffectConstants = Object.assign({}, this.beautyEffectConstants, beautyEffectConstants);
    this.activeName = this.beautyEffectConstants.beauty.label;
  },
}
</script>
<style scoped lang="scss">
@import "../assets/variable.scss";

.tui-beauty-panel {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 0.5rem;
  font-size: $font-beauty-config-panel-size;
}

.tui-form {
  position: absolute;
  top: 2rem;
  left: 0;
  width: 100%;
  height: 2rem;
  display: inline-flex;
  line-height: 2rem;
}

.tui-form-label {
  width: 30%;
  padding-right: 0.5rem;
  text-align: right;
  color: var(--text-color-secondary);
}
.tui-form-range {
  width: 40%;
}
.tui-form-value {
  width: 30%;
  padding-left: 0.5rem;
  text-align: left;
  color: var(--text-color-secondary);
}

.tui-beauty-tabs {
  width: 100%;
  height: 100%;
}

.tui-beauty-tabs-header {
  height: 2rem;
  line-height: 2rem;
  overflow-x: auto;
  overflow-y: hidden;
  color: var(--text-color-secondary);
}

.tui-tab-nav-button {
  margin: 0 0.25rem;
  padding: 0.0625rem 0.125rem;
  border: none;
  background: $color-beauty-config-tab-nav-button-background;
  color: inherit;
  cursor: pointer;

  &.is-active {
    padding-bottom: 0.375rem;
    color: var(--text-color-link);
    box-shadow: 0 0.125rem 0 0 var(--text-color-link);
  }
}

.tui-tab-nav-button:hover {
  color: $color-anchor-hover;
}

.tui-beauty-tabs-panels {
  height: calc(100% - 2rem);
  padding-top: 2rem;
  background-color: var(--bg-color-dialog);
}

.tui-tab-panel {
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: var(--bg-color-dialog);

  &.tui-no-form {
    height: calc(100% + 2rem);
    margin-top: -2rem;
  }
}

.is-active {
  color: $color-primary;
}

.tui-beauty-property-list {  
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  margin: 0;
  padding-left: 0;
  list-style: none;
}

.tui-beauty-property-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 3rem;
  margin: 0.5rem 0.375rem 0 0.375rem;
  text-align: center;
  color: var(--text-color-primary);
  cursor: pointer;

  img {
    background-color: #808080;
  }
}

.tui-beauty-property-item-backgound {
  width: 6rem;
}

.tui-beauty-property-item:hover img {
  outline: 0.1875rem solid $color-anchor-hover;
  
}

.tui-beauty-property-item.is-active {
  color: $color-anchor-hover;
}

.tui-beauty-property-item.is-active img{
  outline: 0.1875rem solid $color-anchor-hover;
  border-radius: 0.75rem;
}

.tui-beauty-property-image {
  width: 3rem;
  height: 3rem;
  border-radius: 0.5rem;
  color:blue;
  background-color: var(--bg-color-entrycard);
}

.tui-virtual-image {
  width: 6rem;
  height: 3rem;
  border-radius: 0.25rem;
}

.tui-beauty-label {
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  color: var(--text-color-secondary);
}

input[type='range'] {
  position: relative;
  -webkit-appearance: none;
  -moz-appearance: none;
  background: var(--bg-color-dialog);
  cursor: pointer;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    border-radius: 0.125rem;
    width: calc(var(--slider-filled-width));
    height: 0.125rem;
    background-color: var(--slider-color-filled);
  }
}

input[type=range]:focus {
  outline: none;
}

input[type='range']::-webkit-slider-runnable-track {
  -webkit-appearance: none;
  height: 0.125rem;
  background-color: var(--slider-color-empty);
  border-radius: 0.125rem;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  position: absolute;
  left: var(--slider-filled-width);
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 50%;
  background: var(--slider-color-button);
  transform: translate(-0.375rem,-0.3rem);
  border: 2px solid var(--text-color-link);
  z-index: 9999;
}
</style>