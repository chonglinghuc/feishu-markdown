<template>
  <!-- <el-text>{{ selectValue }}</el-text> -->
  <!-- <el-text>{{ selectCellValue }}</el-text> -->
  <div class="md-render-container">
    <el-row class="md-render-row preview-row">
      <el-col :span="24" class="preview-area">
        <div class="markdown-preview" v-html="renderedHtml"></div>
      </el-col>
    </el-row>

    <!-- 新增操作栏 -->
    <el-row class="action-row">
      <el-col :span="24" class="action-area">
        <el-button type="primary" size="small" @click="saveToTable" :disabled="!canSave">
          保存
        </el-button>
        <!-- 使用图标按钮替换文字按钮 -->
        <el-tooltip content="上一行" placement="top" :hide-after="1000">
          <el-button circle @click="selectLastRecord()" size="small">
            <el-icon>
              <ArrowUp />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="下一行" placement="top" :hide-after="1000">
          <el-button circle @click="selectNextRecord()" size="small">
            <el-icon>
              <ArrowDown />
            </el-icon>
          </el-button>
        </el-tooltip>
        <MarkdownToolbar :ctx="ctx"></MarkdownToolbar>
        <el-tooltip :content="isInputVisible ? '隐藏输入框' : '显示输入框'" placement="top" :hide-after="1000">
          <el-button circle size="small" @click="toggleInputArea">
            <el-icon>
              <Hide />
            </el-icon>
          </el-button>
        </el-tooltip>
        <SponsorButton />
        <el-tag v-if="saveStatus" :type="saveStatus.type" size="small">{{
          saveStatus.message
        }}</el-tag>
      </el-col>
    </el-row>

    <el-row class="md-render-row input-row" v-if="isInputVisible">
      <el-col :span="24" class="input-area">
        <!-- <el-input type="textarea" v-model="markdownText" placeholder="请输入 Markdown 文本..." class="markdown-textarea" /> -->
        <MonacoEditor ref="editRef" v-model="markdownText" language="markdown" theme="vs" :options="editorOptions" />
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import MonacoEditor from "@/components/widgets/MonacoEditor.vue";
import MarkdownToolbar from "@/components/widgets/MarkdownToolbar.vue";
import {
  bitable,
  Selection,
  ITable,
  IFieldMeta,
  FieldType,
  IField,
} from "@lark-base-open/js-sdk";
import { ref, onMounted, computed } from "vue";
import { mdEngine } from "@/services/MarkDownEngine";
import "highlight.js/styles/github.css";
// 导入赞助按钮组件
import SponsorButton from "./SponsorButton.vue";
import { baseTableServices } from "@/services/BaseTableServices";
import { AppContext } from "@/services/AppContext";
import { MonacoEditorServices } from "@/services/MonacoEditorServices";
const editorOptions = ref({
  fontSize: 14,
  lineNumbers: 'on',
  roundedSelection: false,
  scrollBeyondLastLine: false
})
const selectValue = ref({
  baseId: "",
  tableId: "",
  viewId: "",
  fieldId: "",
  recordId: "",
});

const editRef = ref(null);

// 定义 Markdown 文本和渲染后的 HTML
const markdownText = ref("");
const originalText = ref(""); // 用于存储原始文本，以便比较是否有修改

// 计算属性：将 Markdown 转换为 HTML
const renderedHtml = computed(() => {
  return mdEngine.render(markdownText.value);
});

// 判断是否可以保存（有选中单元格且内容有修改）
const canSave = computed(() => {
  return (
    selectValue.value.tableId &&
    selectValue.value.recordId &&
    selectValue.value.fieldId &&
    markdownText.value !== originalText.value
  );
});

// 保存状态提示
const saveStatus = ref<{ type: string; message: string } | null>(null);

// 控制输入区域的显示和隐藏
const isInputVisible = ref(true);

// 切换输入区域的显示状态
const toggleInputArea = () => {
  isInputVisible.value = !isInputVisible.value;
};

const ctx = new AppContext()

const initCtx = () => {
  ctx.setEditor(new MonacoEditorServices(editRef.value.getEditor()))
}

// 保存到多维表格的方法
const saveToTable = async () => {
  if (!canSave.value) return;

  try {
    saveStatus.value = { type: "info", message: "保存中..." };

    const table = await bitable.base.getTableById(selectValue.value.tableId);
    await table.setCellValue(
      selectValue.value.fieldId,
      selectValue.value.recordId,
      markdownText.value
    );

    originalText.value = markdownText.value; // 更新原始文本
    saveStatus.value = { type: "success", message: "保存成功" };

    // 3秒后清除状态提示
    setTimeout(() => {
      saveStatus.value = null;
    }, 3000);
  } catch (error) {
    console.error("保存失败:", error);
    saveStatus.value = { type: "danger", message: "保存失败" };
  }
};

const counter = ref(0);
const selectCellValue = ref("");
const selectChange = (select: any) => {
  if (!select || !select.fieldId || !select.recordId || !select.tableId) return;
  selectValue.value = select;
  bitable.base.getTableById(select.tableId).then((table: ITable) => {
    table.getFieldMetaById(select.fieldId).then((m: IFieldMeta) => {
      // console.log(m);
      if (m.type == FieldType.Text) {
        // console.log("选中的的是文本字段", m);
        table.getFieldById(select.fieldId).then((field: IField) => {
          field.getCellString(select.recordId).then((v: string) => {
            // selectCellValue.value = v;
            markdownText.value = v;
            originalText.value = v; // 存储原始文本
            saveStatus.value = null; // 清除之前的保存状态
          });
        });
      }
    });
  });
};
const selectNextRecord = () => {
  baseTableServices.getNextRecord(selectValue.value).then((res) => {
    if (res) {
      selectChange(res);
    }
  });
};


const selectLastRecord = () => {
  baseTableServices.getLastRecord(selectValue.value).then((res) => {
    if (res) {
      selectChange(res);
    }
  });
};
const initListener = async () => {
  try {
    bitable.base.onSelectionChange((e) => {
      selectChange(e.data);
    });
  } catch (error) {
    console.error("初始化监听时出错:", error);
  }
};
onMounted(() => {
  initListener();
  initCtx();
});
</script>
<style scoped>
.md-render-container {
  padding: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* 防止容器本身滚动 */
}

.md-render-row {
  margin-bottom: 0;
  flex: 1;
  height: 45%;
  /* 调整高度以适应新增的操作栏 */
  overflow: hidden;
  /* 防止行容器滚动 */
  ;
}

/* 当输入框隐藏时，预览区域自动填充 */
.preview-row {
  flex: 1;
}

/* 新增操作栏样式 */
.action-row {
  padding: 8px 10px;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  /* flex: 0 0 auto; */
  /* 确保操作栏不会伸缩 */
}

.action-area {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-row,
.input-row {
  display: flex;
  overflow: hidden;
  /* 防止行容器滚动 */
}

.input-area,
.preview-area {
  width: 100%;
  height: 100%;
  padding: 10px;
  overflow: hidden;
  /* 修改这里，防止区域容器滚动 */
}

.input-area {
  overflow: hidden;
}

.markdown-textarea {
  width: 100%;
  height: 100%;
  font-family: "Courier New", Courier, monospace;
}

/* 确保textarea填满整个区域 */
:deep(.el-textarea) {
  height: 100%;
}

:deep(.el-textarea__inner) {
  height: 100% !important;
  resize: none;
}

.markdown-preview {
  padding: 15px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background-color: #fff;
  height: calc(100% - 32px);
  overflow: auto;
  line-height: 1.6;
}

/* 其余样式保持不变 */
</style>
