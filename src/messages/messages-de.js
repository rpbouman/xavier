/*

Copyright 2015 - 2017 Hans Kristian Langva

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
aMsg({
  //messageboxes
  "Please confirm": "Bitte bestätigen",
  "Confirm": "Bestätigen",
  "Cancel": "Stornieren",
  "Ok": "Ok",
  //title:
  "XML/A Visualizer": "Visualisierung auf XML/A",
  //toolbar
  "Refresh metadata": "Metadaten aktualisieren",
  "New Query": "Neue Abfrage",
  "Open Query": "Abfrage öffnen",
  "Save Query": "Abfrage speichern",
  "Save Query As...": "Abfrage speichern unter ...",
  "Toggle edit mode": "Änderungsmodus ein/aus",
  "Run Query": "Abfrage ausführen",
  "Toggle Autorun Query": "Automatische Abfrageausführung ein/ausschalten",
  "Discard this query and start over": "Abfrage neu erstellen",
  //welkom
  "Welcome!": "Willkommen!",
  "en/welcome.html": "de/welcome.html",
  //slice
  "The members on this axis form a selection of the total data set (a slice) or which data are shown.": "Die Elemente in 'Filter' entscheiden, welche Teile des Datenquaders ausgewählt werden.",
  "Optionally, drag any members unto the slicer axis to control which selection of data will be visualized.": "Elemente nach 'Filter' ziehen, um Teile des Datenquaders auszuwählen.",
  //table
  "New Data table": "Neue einfache Tabelle",
  "New Datatable": "Neue einfache Tabelle",
  "Table": "Einfache Tabelle",
  "Items on this axis are used to generate columns for the table": "Elemente auf dieser Achse entsprechen Spalten",
  "Drag any levels, members or measures unto the columns axis to create columns in the data table.": "Ebenen, Elemente oder Werte nach 'Spalten' ziehen, um neue Spalten einzurichten.",
  //pivot table
  "New Pivot table": "Neue Kreuztabelle",
  "New Pivottable": "Neue Kreuztabelle",
  "Show column hierarchy headers": "Spaltenüberschrift zeigen",
  "Show row hierarchy headers": "Zeilenüberschrift zeigen",
  "New Pivot table": "Neue Kreuztabelle", // HKL DUPLIKAT IN ORIGINAL
  "Pivot Table": "Kreuztabelle",
  "Items on this axis are used to generate columns for the pivot table": "Jedes Element entspricht einer Spalte",
  "Drag any levels, members or measures unto the columns axis to create columns in the pivot table.": "Wert(e), Ebene(n) oder Element(e) nach 'Spalten' ziehen.",
  "Items on this axis are used to generate rows for the pivot table": "Jedes Element entspricht einer Zeile",
  "Optionally, drag any levels, members or measures unto the row axis to create rows in the pivot table.": "Wert(e), Ebene(n) oder Element(e) nach 'Reihen' ziehen.",
  //Chart - generic options
  "For each unique combination of members, a chart is created.": "Jede Element-Kombination entspricht ein Diagramme.",
  "Optionally, drop levels or members on the columns axis to create a list of multiple charts.": "Ebene(n) oder Element(e) in 'Spalten' entsprechen Kolonnen von Diagramme (Optional!).",
  "For each unique combination of members, one row is layed out and each column is filled with a chart.": "Jede Element-Kombination entspricht einer Zeile im Diagramm.",
  "Optionally, drop levels or members on the columns axis and rows axis to create a matrix of multiple charts.": "Optional: Ebene oder Elemente nach 'Spalten' und 'Zeilen' ziehen um eine Matrix von Diagramme zu erstellen.",
  //pie chart
  "Pie Chart": "Kuchendiagramm",
  "New Pie chart": "Neues Kuchendiagramm",
  "New Piechart": "Neues Kuchendiagramm",
  "Categories": "Sektoren",
  "Each combination of members forms a category to generate one slice of the pie chart. Choose one level, or a selection of members from a single level per hierarchy.": "Die Werte entsprechen die Sektorgröße.",
  "Drag levels or members to the categories axis. This will create the categories by which the pie chart(s) will be divided.": "Element(e) oder Ebene(n) nach 'Sektoren' ziehen, um die Kuchensektoren zu erstellen",
  "Each measure on this axis generates one pie chart for that measure. Its value determines the size of the pie chart slices.": "Each measure on this axis generates one pie chart for that measure. Its value determines the size of the pie chart slices.",
  "Drag measures to the measures axis. A pie chart will be created for each measure, and the pie slices are sized according to the value of the measure.": "Ein Wert an 'Werte' ziehen, um (noch) ein Kuchen zu erstellen. Jede Wert-Ausprägung wird als Sektor gezeigt.",
  "For each unique combination of members, one column is layed out and filled with pie charts.": "Jede Element-Kombination wird in einer Spalte von Kuchendiagramme reflektiert.",
  "Optionally, drop levels or members on the columns axis to create a list of multiple pies.": "(Optional:  Ebene oder Wert nach 'Spalte' ziehen, um eine Liste mehrere Kuchendiagramme zu erstellen.",
  "For each unique combination of members, one row is layed out and its columns are filled with pie charts.": "Jede Element-Kombination wird in einer Zeile von Kuchendiagramme reflektiert.",
  "Optionally, drop levels or members on the rows axis and on the column axis to create a matrix of multiple pies.": "Optional - Ebenen oder Elemente nach 'Spalte' und 'Zeile' ziehen, um eine Matrix von mehreren Kuchendiagramme zu erstellen.",
  //Bar chart
  "Bar Chart": "Balkendiagramm",
  "Grouped Bar Chart":"Gruppiertes Balkendiagramm",
  "New Bar chart": "Neues Balkendiagramm",
  "New Barchart": "Neues Balkendiagramm",
  "Each measure creates a bar, and the value of the measures controls the extent of the bars. Use the chart options to control whether measures should be grouped or stacked.": "Each measure creates a bar, and the value of the measures controls the extent of the bars. Use the chart options to control whether measures should be grouped or stacked.",
  "Each combination of members forms a category to generate bars in the bar chart. Choose one level, or a selection of members from a single level per hierarchy.": "Each combination of members forms a category to generate bars in the bar chart. Choose one level, or a selection of members from a single level per hierarchy.",
  "Drag levels or members to the categories axis to create categories for which bars are drawn.": "Ebene oder Elemente nach 'Sektoren' ziehen, um Balken-Kategorien festzulegen.",
  "Drag measures to the measures axis. The measure value determines the size of the bar.": "Werte nach 'Werte' ziehen, um die Balkengroesse festzulegen.",
  "For each unique combination of members, a bar chart is created.": "For each unique combination of members, a bar chart is created.",
  "Optionally, drop levels or members on the columns axis to create a list of multiple bar charts.": "Wenn mehrere Diagramme erwünscht sind, kann ebenen oder Elemente nach 'Spalten' gezogen werden.",
  "For each unique combination of members, one row is layed out and each column is filled with a bar chart.": "For each unique combination of members, one row is laid out and each column is filled with a bar chart.",
  "Optionally, drop levels or members on the columns axis and rows axis to create a matrix of multiple bar charts.": "Optionally, drop levels or members on the columns axis and rows axis to create a matrix of multiple bar charts.",
  //time series chart
  "Time": "Zeit",
  "Value": "Wert",
  "for": "für",
  "Time Series Chart": "Zeitreihendiagramm",
  "New Time Series chart": "Neues Zeitreihendiagramm",
  "Each measure creates a line, and the value of the measures controls the y coordinate. Use the chart options to control whether to draw lines or areas.": "Jedes Wert entspricht eine Linie und deren y-Koordinate. (Noch nicht aktviert: Die Diagrammoptionen entscheiden, ob Linien oder Flächen gezeichnet werden).",
  "Drag one measure to the measures axis. Its value(s) determines the y coordinate(s) of the line.": "Ein Wert nac 'Werte' ziehen. Damit werden die y-Koordinate der Linie festgelegt.",
  "Drag member or levels from one particular date hierarchy.": "Drag member or levels from one particular date hierarchy.",
  "Drag levels or members to the time axis to define granularity and selected periods.": "Drag levels or members to the time axis to define granularity and selected periods.",
  "Drag two members of one date hierarchy level to define the time period.": "Eine Ebene oder zwei (von- und bis-)Elemente einer Zeit-Hierarchie nach 'Zeit' ziehen",
  "Drag levels or members to the categories axis to create categories for which lines are drawn.": "Drag levels or members to the categories axis to create categories for which lines are drawn.",
  "Drag levels or members to the time axis to define granularity and selected periods.": "Drag levels or members to the time axis to define granularity and selected periods.",
  //query
  "Error executing query": "Fehler bei der Ausführung der Abfrage",
  //treeview
  "Members": "Elemente",
  "Member": "Element",
  "Measures": "Werte",
  "Measure": "Wert",
  "Show catalog nodes": "Zeige nur Schema mit/ohne Quader(n)",
  "Show dimension nodes": "Zeige Dimension nur einmal",
  "Check the box to display catalog nodes in the treeview. Uncheck to hide.": "Ankreuzen, um Schema mit Quadern als Baumstruktur zu zeigen.", 
  "Check to show multi-hierarchy dimension nodes. Uncheck to hide all dimension nodes.": "Ankreuzen, um alle Dimensionen mit ihren Hierarchien als Baumstruktur zu zeigen.",
  //query designer
  "Columns": "Spalten",
  "Rows": "Zeilen",
  "Slicer": "Filter",
  //sorting
  "Sort Options": "Sortier-Parameter",
  "Drop a measure, level, or property here to sort the output of this axis in the query result.": "Wert(e), Element(e) oder Ebene(n) angeben, um die Sortierung festzulegen.",
  "Click to toggle sort direction.": "Sortierungsreihenfolge umkehren.",
  //workarea
  "This action will close all tab pages associated with the current cube. Do you want to continue?": "Wenn Sie weitermachen werden alle Reiter für diesen Quader geloescht. Weitermachen?",
  "Close tabs for current cube?": "Alle Reiter für den aktuellen Quader schliessen?",
  "Yes": "Ja",
  "No": "Nein",
  //excel
  "Export to Microsoft Excel": "Nach Microsoft Excel exportieren",
  "Nothing to export": "Nichts zu exportieren",
  "There is nothing to export. Please enter a query first.": "Nichts zu exportieren.",
  "Export Error": "Export Fehler",
  "There is nothing to export. Please enter a query first.": "Nichts zu exportieren.", // HKL DUPLIKAT in ORIGINAL
  "and": "und",
  "per": "per",
  "by": "per",
  "vs": "vs",
  "for a selection of": "für die Auswahl von",
  "Title": "Titel",
  "Catalog": "Katalog",
  "Cube": "Datenquader/Kubus",
  "Selection": "Auswahl",
  "Export Date": "Exportdatum",
  //filter:
  "At least one Date dimension is required.": "Für die Ausführung der Abfrage ist eine Zeit-Dimension erforderlich.",
 // 
  "Statistics": "Statistik",
  "Min/Max": "Min/Max",
  "Running calculations":"Änderungen und Gesamtsummen",
  "Standard deviation": "Standardabweichung",
  "Average of ${1}":"Durchschnitt ${1}",
  "Count of ${1}":"Anzahl Elemente pro Zelle für ${1}",
  "Median of ${1}":"Median ${1}",
  "Rank of ${1}":"${1}: Rangfolge",
  "Sum of ${1}":"${1}: Kumulierte Summen",
//
  "${1} child" : "${1}",
  "${1} children": "${1}",
  //
  // HKL addendum

  "${1} Members": "${1} Elemente",
  "Measures:": "Werte:",
  //"${1} percentage CAPTION":"${1} Anteil in %",
  "${1} percentage":"${1}: %-Anteil",
  "${1} columns percentage":"${1}: %-Anteil der Spaltengruppe(n)",
  "${1} rows percentage":   "${1}: %-Anteil der Zeilengruppe(n)",
  "${1} percentage of all": "${1}: %-Anteil von allen",
  "${1} as a percentage all categories that appear on all axes in only this query":"${1}: %-Anteil der ausgewählte Werte",
  "${1} as a percentage all categories that appear on the rows axis in only this query":"${1}: %-Anteil der ausgewählte Werte auf den Zeilen",
   "${1} as a percentage all categories that appear on the columns axis in only this query":"${1}: Anteil in % der ausgewählte Werte auf den Spalten",
   "${1} as a percentage of all categories along all hierarchies on all axes.":"${1}: %-Anteil alle ausgewählte Werte",
   "${1} as a percentage of the parent level of all hierarchies along all axes.":"${1} %-Anteil auf Basis der übergeordnete Gruppe.",
  "${1} percentage of parent":"${1}: %-Anteil von der übergeordnete Gruppe",

  "${1} min": "Minimum von ${1}",
  "${1} max": "Maximum von ${1}",
  "Minimum of ${1}": "Minimum von ${1}",
  "Maximum of ${1}": "Maximum von ${1}",
  "${1} as the minimum over categories that appear on all axes in only this query": "Das Minimum von ${1} die in dieser Abfrage vorkommt",
  "${1} as the maximum over categories that appear on all axes in only this query": "Das Maximum von ${1} die in dieser Abfrage vorkommt",
  "Percentages": "Prozente",
  "Percentage": "Prozent",
  "New Combichart": "Neues Kombinationsdiagramm",
  "New Combi chart": "Neues Kombinationsdiagramm",
  "Cumulative sum of ${1} over rows":"${1}: Kumulierte Zeilen-Summe",
  "Cumulative sum of ${1} over columns":"${1}: Kumulierte Spalten-Summe",
  "Cumulative sum of ${1}":"${1}: Kumulierte Summe",
  "Delta of ${1}":"${1}: Änderungen",
  "${1} as the rank over categories that appear on all axes in only this query":"Rangordnung nach ${1}",
  "Drag one measure unto y-axis.":"Ebene(n) oder Element(e) nach 'X-Achse' ziehen.",
  "Drag one measure unto the y-axis.":"Ebene(n) oder Element(e) nach 'X-Achse' ziehen.",
  "Drag any levels, members, measures, or properties unto the columns axis to create the primary x axis.":"Einen Wert nach 'Y-Achse' ziehen.",
  "Drag any levels or members unto the x-axis.":"Exakt einen Wert nach 'Y-Achse' ziehen.",
  "Drag any levels, members, measures, or properties unto the columns axis to create the primary x axis.":"Exakt einen Wert nach 'Y-Achse' ziehen.",
  "x-axis":"X-Achse",
  "y-axis":"Y-Achse",
  "Primary x-axis":"Primäre X-Achse",
  "Primary y-axis":"Primäre Y-Achse",
  "Combi Chart":"Kombinationsdiagramm",
  "Error rendering dataset":"Fehler bei der Diagrammerstellung",
  "For each unique combination of members, a list item is layed out and filled with pie charts.":"Jede Elementkombinationen entsprichen einen Matrix von Diagramme",
  "Generic Chart":"Generischer Diagramm",
  "Loading catalogs for datasource ${1}":"Kataloge für die Dataquelle ${1} werden geladen..",
  "Loading cubes for catalog ${1}":"Quadern fue Katalog ${1} werden geladen...",
  "Loading datasources...":"Datenquellen werden geladen...",
  "No datasources found.":"Keine Datenquellen gefunden.",
  "Optionally, drag any members unto the 'Slicer' to select data to be visualized.":"Elemente nach 'Filter', um Daten für die Anzeige auszuwählen.",
  "Combi Chart":"Kombinationsdiagramm",
  //
  // Fehlende Messages:
  "Click on the information icon for a description.":"Klicken Sie auf das Informations-Icon, um die Annotation in einen neuen Reiter zu sehen",
  "HKL ENDE ohne Komma": "HKL ENDE ohne Komma"
});
