/*

Copyright 2014, 2015 Roland Bouman (roland.bouman@gmail.com)

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/
var XlsxExporter;

(function(){
/*
* See: https://msdn.microsoft.com/en-us/library/documentformat.openxml.spreadsheet(v=office.14).aspx
*/

(XlsxExporter = function(){
}).prototype = {
  mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  extension: "xlsx",
  getAppXml: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
      "<Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\" xmlns:vt=\"http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes\"><TotalTime>0</TotalTime><Application>LibreOffice/4.1.3.2$Linux_X86_64 LibreOffice_project/410m0$Build-2</Application></Properties>"
    ].join("\n");
  },
  getCoreXml: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
      "<cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcmitype=\"http://purl.org/dc/dcmitype/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><dcterms:created xsi:type=\"dcterms:W3CDTF\">2015-03-14T02:06:42Z</dcterms:created><dc:creator>Roland Bouman</dc:creator><cp:revision>0</cp:revision></cp:coreProperties>"
    ].join("\n");
  },
  packDocProps: function(){
    var docProps = this.jsZip.folder("docProps");
    docProps.file("app.xml", this.getAppXml());
    docProps.file("core.xml", this.getCoreXml());
  },
  getDotRels: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">",
      "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/>",
      "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties\" Target=\"docProps/core.xml\"/>",
      "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties\" Target=\"docProps/app.xml\"/>",
      "</Relationships>"
    ].join("\n");
  },
  pack_Rels: function(){
    var _rels = this.jsZip.folder("_rels");
    _rels.file(".rels", this.getDotRels());
  },
  getWorkbookXmlRels: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">",
      "<Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/>",
      "<Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/>",
      "<Relationship Id=\"rId3\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\" />",
      "</Relationships>"
    ].join("\n");
  },
  getTheme1Xml: function(){
  },
  getSheet1Xml: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
      "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\">",
        "<sheetPr filterMode=\"false\">",
            "<pageSetUpPr fitToPage=\"false\"/>",
        "</sheetPr>",
        "<sheetViews>",
            "<sheetView colorId=\"64\" defaultGridColor=\"true\" rightToLeft=\"false\" showFormulas=\"false\" showGridLines=\"true\" showOutlineSymbols=\"true\" showRowColHeaders=\"true\" showZeros=\"true\" tabSelected=\"true\" topLeftCell=\"A1\" view=\"normal\" windowProtection=\"false\" workbookViewId=\"0\" zoomScale=\"100\" zoomScaleNormal=\"100\" zoomScalePageLayoutView=\"100\">",
                "<selection activeCell=\"A1\" activeCellId=\"0\" pane=\"topLeft\" sqref=\"A1\"/>",
            "</sheetView>",
        "</sheetViews>",
        "<sheetFormatPr defaultRowHeight=\"12.8\"/>",
        this.getSheetContentsXml(),
        "<printOptions headings=\"false\" gridLines=\"false\" gridLinesSet=\"true\" horizontalCentered=\"false\" verticalCentered=\"false\"/>",
        "<pageMargins left=\"0.7\" right=\"0.7\" top=\"0.7\" bottom=\"0.7\" header=\"0.3\" footer=\"0.3\"/>",
        "<pageSetup blackAndWhite=\"false\" cellComments=\"none\" copies=\"1\" draft=\"false\" firstPageNumber=\"1\" fitToHeight=\"1\" fitToWidth=\"1\" horizontalDpi=\"300\" orientation=\"portrait\" pageOrder=\"downThenOver\" paperSize=\"1\" scale=\"100\" useFirstPageNumber=\"true\" usePrinterDefaults=\"false\" verticalDpi=\"300\"/>",
        "<headerFooter differentFirst=\"false\" differentOddEven=\"false\">",
            "<oddHeader>&amp;C&amp;\"Times New Roman,Regular\"&amp;12&amp;A</oddHeader>",
            "<oddFooter>&amp;C&amp;\"Times New Roman,Regular\"&amp;12Page &amp;P</oddFooter>",
        "</headerFooter>",
      "</worksheet>"
    ].join("\n");
  },
  getSharedStringsXml: function(){
    var sharedStrings = this.sharedStrings, xml = "";
    var i, n = sharedStrings.length;
    for (i = 0; i < n; i++) {
      xml += "<si><t>" + escXml(sharedStrings[i]) + "</t></si>";
    }
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
      "<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"" + n + "\" uniqueCount=\"" + n + "\">",
      xml,
      "</sst>"
    ].join("\n");
  },
  getSharedString: function(string){
    var sharedStrings = this.sharedStrings;
    var index = sharedStrings.indexOf(string);
    if (index === -1) {
      index = sharedStrings.length;
      sharedStrings.push(string);
    }
    return "<v>" + index + "</v>";
  },
  getStylesXml: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
      "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">",
        "<numFmts count=\"1\">",
          "<numFmt formatCode=\"GENERAL\" numFmtId=\"164\"/>",
        "</numFmts>",
        "<fonts count=\"4\">",
          "<font><sz val=\"10\"/><name val=\"Arial\"/><family val=\"2\"/></font>",
          "<font><sz val=\"10\"/><name val=\"Arial\"/><family val=\"0\"/></font>",
          "<font><sz val=\"10\"/><name val=\"Arial\"/><family val=\"0\"/></font>",
          "<font><sz val=\"10\"/><name val=\"Arial\"/><family val=\"0\"/></font>",
        "</fonts>",
        "<fills count=\"2\">",
          "<fill><patternFill patternType=\"none\"/></fill>",
          "<fill><patternFill patternType=\"gray125\"/></fill>",
        "</fills>",
        "<borders count=\"1\">",
          "<border diagonalDown=\"false\" diagonalUp=\"false\"><left/><right/><top/><bottom/><diagonal/></border>",
        "</borders>",
        "<cellStyleXfs count=\"20\">",
          "<xf applyAlignment=\"true\" applyBorder=\"true\" applyFont=\"true\" applyProtection=\"true\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"164\">",
            "<alignment horizontal=\"general\" indent=\"0\" shrinkToFit=\"false\" textRotation=\"0\" vertical=\"bottom\" wrapText=\"false\"/>",
            "<protection hidden=\"false\" locked=\"true\"/>",
          "</xf>",
          "<xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"2\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"2\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"0\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"43\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"41\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"44\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"42\"></xf><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"true\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"1\" numFmtId=\"9\"></xf></cellStyleXfs><cellXfs count=\"1\"><xf applyAlignment=\"false\" applyBorder=\"false\" applyFont=\"false\" applyProtection=\"false\" borderId=\"0\" fillId=\"0\" fontId=\"0\" numFmtId=\"164\" xfId=\"0\"><alignment horizontal=\"general\" indent=\"0\" shrinkToFit=\"false\" textRotation=\"0\" vertical=\"bottom\" wrapText=\"false\"/><protection hidden=\"false\" locked=\"true\"/></xf>",
        "</cellXfs>",
        "<cellStyles count=\"6\">",
          "<cellStyle builtinId=\"0\" customBuiltin=\"false\" name=\"Normal\" xfId=\"0\"/>",
          "<cellStyle builtinId=\"3\" customBuiltin=\"false\" name=\"Comma\" xfId=\"15\"/>",
          "<cellStyle builtinId=\"6\" customBuiltin=\"false\" name=\"Comma [0]\" xfId=\"16\"/>",
          "<cellStyle builtinId=\"4\" customBuiltin=\"false\" name=\"Currency\" xfId=\"17\"/>",
          "<cellStyle builtinId=\"7\" customBuiltin=\"false\" name=\"Currency [0]\" xfId=\"18\"/>",
          "<cellStyle builtinId=\"5\" customBuiltin=\"false\" name=\"Percent\" xfId=\"19\"/>",
        "</cellStyles>",
      "</styleSheet>"
    ].join("\n");
  },
  getWorkBookXml: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>",
      "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><fileVersion appName=\"Calc\"/><workbookPr backupFile=\"false\" showObjects=\"all\" date1904=\"false\"/><workbookProtection/><bookViews><workbookView activeTab=\"0\" firstSheet=\"0\" showHorizontalScroll=\"true\" showSheetTabs=\"true\" showVerticalScroll=\"true\" tabRatio=\"141\" windowHeight=\"8192\" windowWidth=\"16384\" xWindow=\"0\" yWindow=\"0\"/></bookViews><sheets><sheet name=\"Sheet1\" sheetId=\"1\" state=\"visible\" r:id=\"rId2\"/></sheets><calcPr iterateCount=\"100\" refMode=\"A1\" iterate=\"false\" iterateDelta=\"0.001\"/></workbook>"
    ].join("\n");
  },
  packXl: function(){
    var xl = this.jsZip.folder("xl");

    var _rels = xl.folder("_rels");
    _rels.file("workbook.xml.rels", this.getWorkbookXmlRels());

    //var theme = xl.folder("theme");
    //theme.file("theme1.xml", this.getTheme1Xml());

    var worksheets = xl.folder("worksheets");
    worksheets.file("sheet1.xml", this.getSheet1Xml());

    xl.file("sharedStrings.xml", this.getSharedStringsXml());
    xl.file("styles.xml", this.getStylesXml());
    xl.file("workbook.xml", this.getWorkBookXml());
  },
  getSheetContentsXml: function(){
    var xml;
    xml = "<sheetData>" + this.rowsXml + "</sheetData>";
    var mergedCells = this.mergedCells;
    if (mergedCells.length) {
      xml += "<mergeCells count=\"" + mergedCells.length + "\">" + mergedCells.join("") + "</mergeCells>";
    }
    return xml;
  },
  getColumnAddress: function(i){
    var address = "", a, d;
    d = 26*26;
    a = i / d;
    if (a > 1) {
      a = parseInt(a, 10);
      i -= a*d;
      address += String.fromCharCode(64+a);
    }
    d = 26;
    a = i / d;
    if (a > 1) {
      a = parseInt(a, 10);
      i -= a*d;
      address += String.fromCharCode(64+a);
    }
    if (i >= 1) {
      address += String.fromCharCode(64+i);
    }
    return address;
  },
  exportPivotTable: function(pivotTable){
    var rowsXml = [];
    var mergedCells = this.mergedCells = [];
    var sharedString = this.sharedStrings = [];
    var dataset = pivotTable.getDataset();
    if (dataset) {
      var me = this;
      var columnsOffset = 1, rowOffset = 1;
      var rowAxis, columnAxis;
      if (dataset.hasRowAxis()) {
        rowAxis = dataset.getRowAxis();
        columnsOffset += rowAxis.hierarchyCount();
        rowsTable = pivotTable.getRowsTableDom();
      }
      var member, caption, ref, type = "s", style = "0";

      //render the column axis
      if (dataset.hasColumnAxis()) {
        columnAxis = dataset.getColumnAxis();
        rowOffset += columnAxis.hierarchyCount();
        columnAxis.eachHierarchy(function(hierarchy){
          rowsXml.push("<row>");
          columnAxis.eachTuple(function(tuple){
            member = tuple.members[hierarchy.index];
            caption = member[Xmla.Dataset.Axis.MEMBER_CAPTION];
            ref = me.getColumnAddress(columnsOffset + tuple.index) + String(hierarchy.index + 1);
            rowsXml.push("<c r=\"" + ref + "\" s=\"" + style + "\" t=\"" + type + "\">");
            rowsXml.push(me.getSharedString(caption));
            rowsXml.push("</c>");
          });
          rowsXml.push("</row>");
        });
      }

      //render the cell set
      var cellSet = dataset.getCellset();
      cellSet.reset();

      if (dataset.hasRowAxis()) {
        var hasMoreCells = true,
            ordinal = cellSet.cellOrdinal(),
            minOrdinal, maxOrdinal,
            n = columnAxis.tupleCount()
        ;
        //multiple rows of cells.
        rowAxis.eachTuple(function(tuple){
          type = "s";
          minOrdinal = tuple.index * n;
          maxOrdinal = minOrdinal + n;
          rowsXml.push("<row>");
          rowAxis.eachHierarchy(function(hierarchy){
            member = tuple.members[hierarchy.index];
            caption = escXml(member[Xmla.Dataset.Axis.MEMBER_CAPTION]);
            ref = me.getColumnAddress(hierarchy.index + 1) + String(rowOffset + tuple.index);
            rowsXml.push("<c r=\"" + ref + "\" s=\"" + style + "\" t=\"" + type + "\">");
            rowsXml.push(me.getSharedString(caption));
            rowsXml.push("</c>");
          });
          if (hasMoreCells && ordinal >= minOrdinal && ordinal < maxOrdinal) {
            do {
              ref = me.getColumnAddress(columnsOffset + (ordinal - minOrdinal));
              ref += String(rowOffset + tuple.index);
              type = "n";
              rowsXml.push("<c r=\"" + ref + "\" s=\"" + style + "\" t=\"" + type + "\">");
              rowsXml.push("<v>" + cellSet.cellValue() + "</v>");
              rowsXml.push("</c>");
              ordinal = cellSet.nextCell();
            } while ((hasMoreCells = (ordinal !== -1)) && ordinal < maxOrdinal);
          }
          rowsXml.push("</row>");
        });
      }
      else {
        //either a column axis, or no column axis.
        //in both cases, we have one row of cells
        type = "n";
        rowsXml.push("<row>");
        cellSet.eachCell(function(cell){
          ref = me.getColumnAddress(columnsOffset + cell.ordinal) + String(rowOffset);
          rowsXml.push("<c r=\"" + ref + "\" s=\"" + style + "\" t=\"" + type + "\">");
          rowsXml.push("<v>" + cell.Value + "</v>");
          rowsXml.push("</c>");
        });
        rowsXml.push("</row>");
      }
    }
    this.rowsXml = rowsXml.join("");
  },
  getContentXml: function(){
    return [
      "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
      "<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">",
      "<Override PartName=\"/_rels/.rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>",
      "<Override PartName=\"/docProps/app.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.extended-properties+xml\"/>",
      "<Override PartName=\"/docProps/core.xml\" ContentType=\"application/vnd.openxmlformats-package.core-properties+xml\"/>",
      "<Override PartName=\"/xl/_rels/workbook.xml.rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>",
      "<Override PartName=\"/xl/sharedStrings.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml\" />",
      "<Override PartName=\"/xl/worksheets/sheet1.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>",
      "<Override PartName=\"/xl/styles.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml\"/>",
      "<Override PartName=\"/xl/workbook.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml\"/>",
      "</Types>"
    ].join("\n");
  },
  pack: function(){
    this.jsZip = new JSZip();
    this.packDocProps();
    this.pack_Rels();
    this.packXl();
    this.jsZip.file("[Content_Types].xml", this.getContentXml());
  },
  getContent: function(){
    var mimetype = this.mimetype;
    return "data:" + mimetype + ";base64," + encodeURIComponent(this.jsZip.generate());
    //window.open(this.getContent());
  },
  export: function(name, object){
    if (object instanceof PivotTable) {
      this.exportPivotTable(object);
    }
    else {
      throw "Don't know how to export this type of object.";
    }
    this.pack();
    var content = this.jsZip.generate({type: "blob"});
    saveAs(content, name + "." + this.extension);
  }
};

})();