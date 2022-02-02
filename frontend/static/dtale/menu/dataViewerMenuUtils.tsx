import { buildClickHandler } from '../../menuUtils';
import { AppActions } from '../../redux/actions/AppActions';
import { cleanupEndpoint } from '../../redux/actions/url-utils';
import { InstanceSettings, Popups, PopupType, SortDef, SortDir } from '../../redux/state/AppState';
import * as bu from '../backgroundUtils';
import { ColumnDef, ColumnFormatStyle, DataViewerPropagateState, DataViewerState } from '../DataViewerState';
import { ColumnType } from '../gridUtils';

/** placholder for simple void function */
export type VoidFunc = () => void;

export const updateSort = (
  selectedCols: string[],
  dir: SortDir | undefined,
  sortInfo: SortDef[],
  updateSettings: (updatedSettings: Partial<InstanceSettings>) => AppActions<void>,
): void => {
  let updatedSortInfo = sortInfo.filter(([col, _dir]) => !selectedCols.includes(col));
  switch (dir) {
    case SortDir.ASC:
    case SortDir.DESC:
      updatedSortInfo = updatedSortInfo.concat(selectedCols.map((col) => [col, dir]));
      break;
    default:
      break;
  }
  updateSettings({ sortInfo: updatedSortInfo });
};

export const buildStyling = (
  val: string | number | undefined,
  colType: ColumnType,
  styleProps: ColumnFormatStyle,
): React.CSSProperties => {
  const style: React.CSSProperties = {};
  if (val !== undefined) {
    if (styleProps.redNegs) {
      switch (colType) {
        case ColumnType.FLOAT:
        case ColumnType.INT:
          style.color = val < 0 ? 'red' : '';
          break;
        default:
          break;
      }
    }
  }
  return style;
};

export const fullPath = (path: string, dataId?: string): string => {
  const finalPath = dataId ? `${path}/${dataId}` : path;
  if ((window as any).resourceBaseUrl && !finalPath.startsWith((window as any).resourceBaseUrl)) {
    return cleanupEndpoint(`${(window as any).resourceBaseUrl}/${finalPath}`);
  }
  return finalPath;
};

export const open = (path: string, dataId?: string, height = 450, width = 500, isVSCode = false): void => {
  const url = fullPath(path, dataId);
  if (isVSCode) {
    window.location.assign(url);
  } else {
    window.open(url, '_blank', `titlebar=1,location=1,status=1,width=${width},height=${height}`);
  }
};

export const shouldOpenPopup = (height: number, width: number): boolean => {
  if (global.top === global.self) {
    // not within iframe
    return window.innerWidth < width + 100 || window.innerHeight < height + 100;
  }
  return true;
};

export const openPopup =
  (
    popup: Popups,
    dataId: string,
    openChart: (chartData: Popups) => AppActions<void>,
    height = 450,
    width = 500,
    isVSCode = false,
  ): VoidFunc =>
  (): void => {
    if (shouldOpenPopup(height, width)) {
      open(`/dtale/popup/${popup.type}`, dataId, height, width, isVSCode);
    } else {
      openChart(popup);
    }
  };

/** Input properties for hot key builder */
interface HotkeyProps {
  backgroundMode?: string;
  columns: ColumnDef[];
  propagateState: DataViewerPropagateState;
  openChart: (chartData: Popups) => AppActions<void>;
  dataId: string;
  isVSCode: boolean;
}

/** Hot key builder output properties */
interface HotKeyOutput {
  openTab: (type: string) => VoidFunc;
  openPopup: (popup: Popups, height?: number, width?: number) => VoidFunc;
  MENU: VoidFunc;
  DESCRIBE: VoidFunc;
  NETWORK: VoidFunc;
  FILTER: VoidFunc;
  BUILD: VoidFunc;
  CLEAN: VoidFunc;
  DUPLICATES: VoidFunc;
  CHARTS: VoidFunc;
  CODE: VoidFunc;
  ABOUT: () => AppActions<void>;
  LOGOUT: VoidFunc;
  SHUTDOWN: VoidFunc;
  toggleBackground: (bgType: string) => VoidFunc;
  toggleOutlierBackground: VoidFunc;
  exportFile: (fileType: string) => VoidFunc;
}

export const buildHotkeyHandlers = (props: HotkeyProps): HotKeyOutput => {
  const { backgroundMode, propagateState, openChart, dataId, isVSCode } = props;
  const openMenu = (): void => {
    propagateState({ menuOpen: true });
    buildClickHandler(() => propagateState({ menuOpen: false }));
  };
  const openTab = (path: string): void => {
    const url = fullPath(path, dataId);
    if (isVSCode) {
      window.location.assign(url);
    } else {
      window.open(url, '_blank');
    }
  };
  const openPopupTab =
    (type: string): VoidFunc =>
    (): void =>
      openTab(`/dtale/popup/${type}`);
  const openNetwork = (): void => openTab('/dtale/network');
  const openCharts = (): void => openTab('/dtale/charts');
  const openCodeExport = (): void => open('/dtale/popup/code-export', dataId, 450, 700, isVSCode);
  const bgState = (bgType: string): Partial<DataViewerState> => ({
    backgroundMode: backgroundMode === bgType ? undefined : bgType,
    triggerBgResize: bu.RESIZABLE.includes(backgroundMode ?? '') || bu.RESIZABLE.includes(bgType),
  });
  const toggleBackground =
    (bgType: string): VoidFunc =>
    () =>
      props.propagateState(bgState(bgType));
  const toggleOutlierBackground = (): void => {
    const updatedState = bgState('outliers');
    if (updatedState.backgroundMode === 'outliers') {
      updatedState.columns = props.columns.map(bu.buildOutlierScales);
    }
    props.propagateState(updatedState);
  };
  const exportFile =
    (fileType: string): VoidFunc =>
    (): void => {
      window.open(`${fullPath('/dtale/data-export', dataId)}?type=${fileType}&_id=${new Date().getTime()}`, '_blank');
    };
  return {
    openTab: openPopupTab,
    openPopup: (popup: Popups, height = 450, width = 500) =>
      openPopup(popup, dataId, openChart, height, width, isVSCode),
    MENU: openMenu,
    DESCRIBE: openPopupTab('describe'),
    NETWORK: openNetwork,
    FILTER: openPopup(
      { type: PopupType.FILTER, title: 'Filter', visible: true },
      dataId,
      openChart,
      530,
      1100,
      isVSCode,
    ),
    BUILD: openPopup(
      { type: PopupType.BUILD, title: 'Build', visible: true, propagateState },
      dataId,
      openChart,
      515,
      800,
      isVSCode,
    ),
    CLEAN: openPopup(
      { type: PopupType.CLEANERS, visible: true, propagateState },
      dataId,
      openChart,
      515,
      800,
      isVSCode,
    ),
    DUPLICATES: openPopup({ type: PopupType.DUPLICATES, visible: true }, dataId, openChart, 400, 770, isVSCode),
    CHARTS: openCharts,
    CODE: openCodeExport,
    ABOUT: () => openChart({ type: PopupType.ABOUT, size: 'sm', backdrop: true, visible: true }),
    LOGOUT: () => (window.location.pathname = fullPath('/logout')),
    SHUTDOWN: () => (window.location.pathname = fullPath('/shutdown')),
    toggleBackground,
    toggleOutlierBackground,
    exportFile,
  };
};