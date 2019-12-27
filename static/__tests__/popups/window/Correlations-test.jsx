import qs from "querystring";

import { mount } from "enzyme";
import _ from "lodash";
import React from "react";

import CorrelationsTsOptions from "../../../popups/correlations/CorrelationsTsOptions";
import mockPopsicle from "../../MockPopsicle";
import correlationsData from "../../data/correlations";
import * as t from "../../jest-assertions";
import { buildInnerHTML, withGlobalJquery } from "../../test-utils";

const chartData = {
  visible: true,
  type: "correlations",
  title: "Correlations Test",
  query: "col == 3",
  col1: "col1",
  col2: "col3",
};

const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");

describe("Correlations tests", () => {
  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      value: 500,
    });
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
      configurable: true,
      value: 500,
    });

    const mockBuildLibs = withGlobalJquery(() =>
      mockPopsicle.mock(url => {
        if (url.startsWith("/dtale/correlations/")) {
          const query = qs.parse(url.split("?")[1]).query;
          if (query == "null") {
            return { error: "No data found." };
          }
          if (query == "one-date") {
            return { data: correlationsData.data, dates: ["col4"] };
          }
          if (query == "no-date") {
            return { data: correlationsData.data, dates: [] };
          }
          if (query == "rolling") {
            return _.assignIn({ rolling: true }, correlationsData);
          }
        }
        const { urlFetcher } = require("../../redux-test-utils").default;
        return urlFetcher(url);
      })
    );

    const mockChartUtils = withGlobalJquery(() => (ctx, cfg) => {
      const chartCfg = { ctx, cfg, data: cfg.data, destroyed: false };
      chartCfg.destroy = () => (chartCfg.destroyed = true);
      chartCfg.getElementsAtXAxis = _evt => [{ _index: 0 }];
      return chartCfg;
    });

    jest.mock("popsicle", () => mockBuildLibs);
    jest.mock("chart.js", () => mockChartUtils);
    jest.mock("chartjs-plugin-zoom", () => ({}));
    jest.mock("chartjs-chart-box-and-violin-plot/build/Chart.BoxPlot.js", () => ({}));
  });

  afterAll(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalOffsetHeight);
    Object.defineProperty(HTMLElement.prototype, "offsetWidth", originalOffsetWidth);
  });

  test("Correlations rendering data", done => {
    const Correlations = require("../../../popups/Correlations").ReactCorrelations;
    const ChartsBody = require("../../../popups/charts/ChartsBody").default;
    buildInnerHTML({ settings: "" });
    const result = mount(<Correlations chartData={chartData} dataId="1" />, {
      attachTo: document.getElementById("content"),
    });
    result.update();
    setTimeout(() => {
      result.update();
      setTimeout(() => {
        result.update();
        t.equal(result.find(ChartsBody).length, 1, "should show correlation timeseries");
        t.deepEqual(
          result
            .find("select.custom-select")
            .first()
            .find("option")
            .map(o => o.text()),
          ["col4", "col5"],
          "should render date options for timeseries"
        );
        result
          .find("select.custom-select")
          .first()
          .simulate("change", { target: { value: "col5" } });
        setTimeout(() => {
          result.update();
          t.ok((result.state().selectedDate = "col5"), "should change timeseries date");
          done();
        }, 200);
      }, 200);
    }, 200);
  });

  test("Correlations rendering data and filtering it", done => {
    const Correlations = require("../../../popups/Correlations").ReactCorrelations;
    const CorrelationsGrid = require("../../../popups/correlations/CorrelationsGrid").default;
    buildInnerHTML({ settings: "" });
    const result = mount(<Correlations chartData={chartData} dataId="1" />, {
      attachTo: document.getElementById("content"),
    });
    result.update();
    setTimeout(() => {
      result.update();
      const corrGrid = result.find(CorrelationsGrid).first();
      t.deepEqual(
        [{ column: "col1", col3: -0.098802 }],
        corrGrid.instance().state.correlations,
        "should filter on col2"
      );
      done();
    }, 200);
  });

  test("Correlations rendering data w/ one date column", done => {
    const Correlations = require("../../../popups/Correlations").ReactCorrelations;
    const ChartsBody = require("../../../popups/charts/ChartsBody").default;
    buildInnerHTML({ settings: "" });
    const result = mount(<Correlations chartData={_.assign({}, chartData, { query: "one-date" })} dataId="1" />, {
      attachTo: document.getElementById("content"),
    });
    result.update();
    setTimeout(() => {
      result.update();
      setTimeout(() => {
        result.update();
        t.equal(result.find(ChartsBody).length, 1, "should show correlation timeseries");
        t.ok(result.find("select.custom-select").length == 0, "should not render date options for timeseries");
        t.ok((result.state().selectedDate = "col5"), "should change timeseries date");
        done();
      }, 200);
    }, 200);
  });

  test("Correlations rendering data w/ no date columns", done => {
    const Correlations = require("../../../popups/Correlations").ReactCorrelations;
    buildInnerHTML({ settings: "" });
    const result = mount(<Correlations chartData={_.assign({}, chartData, { query: "no-date" })} dataId="1" />, {
      attachTo: document.getElementById("content"),
    });
    result.update();
    setTimeout(() => {
      result.update();
      setTimeout(() => {
        result.update();
        t.equal(result.find("#rawScatterChart").length, 1, "should show scatter chart");
        done();
      }, 200);
    }, 200);
  });

  test("Correlations rendering rolling data", done => {
    const Correlations = require("../../../popups/Correlations").ReactCorrelations;
    const ChartsBody = require("../../../popups/charts/ChartsBody").default;
    buildInnerHTML({ settings: "" });
    const result = mount(<Correlations chartData={_.assign({}, chartData, { query: "rolling" })} dataId="1" />, {
      attachTo: document.getElementById("content"),
    });
    result.update();
    setTimeout(() => {
      result.update();
      setTimeout(() => {
        result.update();
        t.equal(result.find(ChartsBody).length, 1, "should show correlation timeseries");
        t.equal(result.find("#rawScatterChart").length, 1, "should show scatter chart");
        t.deepEqual(
          result
            .find("select.custom-select")
            .first()
            .find("option")
            .map(o => o.text()),
          ["col4", "col5"],
          "should render date options for timeseries"
        );
        result
          .find("select.custom-select")
          .first()
          .simulate("change", { target: { value: "col5" } });
        setTimeout(() => {
          result.update();
          t.ok((result.state().selectedDate = "col5"), "should change timeseries date");
          result
            .find(CorrelationsTsOptions)
            .find("input")
            .findWhere(i => i.prop("type") === "text")
            .simulate("change", { target: { value: "5" } });
          setTimeout(() => {
            result.update();
            done();
          }, 200);
        }, 200);
      }, 200);
    }, 200);
  });
});
