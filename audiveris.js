//=============================================================================
//  Audiveris plugin
//
//  This plugin asks for a PDF and run audiveris on the command line
//  java needs to be in the path. And you need to modify audiverisHome below.
//
//  Copyright (C)2008 Werner Schweer and others
//
//  This program is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 2.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, write to the Free Software
//  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
//=============================================================================

/***********  MODIFY THIS VALUE *****************/
var audiverisHome = "/usr/bin/audiveris";
/***********  MODIFY THIS VALUE *****************/

var xmlFile;
var form;
var audiveris;

//-------------------------------------------------------------------
//    init
//-------------------------------------------------------------------

function init() {
}

//-------------------------------------------------------------------
//    run
//-------------------------------------------------------------------

function run() {
  var settings = new QSettings("MuseScore", "AudiverisPlugin");
  var defaultOpenDir = settings.value("defaultOpenDir", QDir.homePath());
  
  var filename = QFileDialog.getOpenFileName(this, qsTr("MuseScore: Load PDF File"), defaultOpenDir , 
        "All supported files (*.pdf *.png *.jpg *.jpeg *tif *.tiff *.bmp);;PDF files (*.pdf);;PNG images (*.png);;JPG images (*.jpg *.jpeg);;TIF images (*.tif *.tiff);;BMP images (*.bmp)");
  if(filename){
    var file = new QFileInfo(filename);
    var logFile = file.canonicalPath() + "/" + file.baseName() + ".log";
    xmlFile = file.canonicalPath() + "/" + file.baseName() + ".xml";
    
    //save path
    settings.setValue("defaultOpenDir", file.canonicalPath());
    settings.sync();
    
    //See http://doc.qt.nokia.com/latest/qprocess.html
    var args = [
    "-Xms512M",
    "-Xmx512M",
    //"-Dstdouterr="+logFile,
    "-jar",
    audiverisHome + "/dist/audiveris-4.1beta.jar",
    "-batch",
    "-option",
    "omr.log.Logger.printStackOnWarning=TRUE",
    "-input",
    filename,
    "-export",
    xmlFile
    ];
    
    audiveris = new QProcess();
    audiveris.error.connect(processingError);
    audiveris['finished(int)'].connect(processingFinished);
    audiveris.readyReadStandardOutput.connect(logOutput);
    audiveris.readyReadStandardError.connect(logError);
    
    //open dialog
    openProgressDialog();
     
    audiveris.start("java", args );
  }
}

function openProgressDialog() {
  var loader = new QUiLoader(null);
  var file   = new QFile(pluginPath + "/audiverisProgress.ui");
  file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));
  form = loader.load(file, null);
  form.setWindowFlags(Qt.CustomizeWindowHint);
  form.cancelButton.clicked.connect(closeProgressDialog);
  form.show();  
}

function closeProgressDialog() {
  if(audiveris.state().toString() == "Running")
        audiveris.close();
  form.close();
}

function logOutput() {
  var log = audiveris.readAllStandardOutput();
  form.logTextEdit.appendPlainText(log); 
}

function logError() {
  var newValue = form.progressBar.value + 10;
  form.progressBar.value = (newValue > 100 ? 0 : newValue);
  var log = audiveris.readAllStandardError();
  form.logTextEdit.appendPlainText(log); 
}

function processingError(error) {
  form.cancelButton.text = qsTr("Close");
  form.label.text = "<font color='red'>" + qsTr("Conversion failed!")+ "</font>";
  form.windowTitle = qsTr("Conversion failed");
  form.progressBar.value = 0;
}
      
function processingFinished(error) {
  form.cancelButton.text = qsTr("Close");
  var fixml = new QFileInfo(xmlFile);
  if(fixml.exists()) {
      form.label.text = qsTr("Conversion successful");
      form.windowTitle = qsTr("Conversion successful");
      form.progressBar.value = 100;
      var score   = new Score();
      score.load(xmlFile);
  }
  else {
      form.label.text = "<font color='red'>" + qsTr("Conversion failed: No MusicXML file generated") + "</font>";
      form.windowTitle = qsTr("Conversion failed");
      form.progressBar.value = 0;
  }
}

var mscorePlugin = {
  menu: 'Plugins.Audiveris',
  init: init,
  run:  run
};

mscorePlugin;

