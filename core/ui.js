'use strict';
/* global $:false, CodeMirror:false */

var UI;
$(function () {

	/**
	 * Class that deal with the user interface
	 * @constructor
	 */
	UI = function()
	{
		var editor;

		/**
		 * Disable or enable buttons with the class that start with `btn-`.
		 * @param {string} button       - Class name of the button without `btn-` 
		 * @param {bool} [disable=true] - `true` to enable the button and `false` to disable it. 
		 */
		this.disableBtn = function(button, disable)
		{
			disable = (disable !== undefined )? disable : true;
			if(disable) {
				$('a.btn-' + button).parent().addClass('disabled');
				$('button.btn-' + button).attr('disabled', 'disable');
			}
			else {
				$('a.btn-' + button).parent().removeClass('disabled');
				$('button.btn-' + button).removeAttr('disabled');
			}
		};

		/**
		 * Replace the *Start* button with *Pause* or *Pause* with *Start*
		 * @param {bool} [show=true] - `true` to show the *Pause* button and `false` show *Start* button. 
		 */
		this.showPauseBtn = function(show)
		{
			show = (show !== undefined )? show : true;
			if(show)
			{
				$('.btn-start').addClass('btn-pause');
				$('.btn-start').html('<span class="glyphicon glyphicon-pause"></span> Pause');
				$('.btn-start').removeClass('btn-start');
			}
			else
			{
				$('.btn-pause').addClass('btn-start');
				$('.btn-pause').html('<span class="glyphicon glyphicon-play"></span> Lancer');
				$('.btn-pause').removeClass('btn-pause');
			}
		};



		/**
		 * Set the editor in read mode and change to the read style
		 * @param {bool} [disable=true] - `true` to disable the editor, `false` to enable it
		 */
		this.disableEditor = function(disable)
		{
			disable = (disable !== undefined )? disable : true;
			if(disable)
			{
				$('.CodeMirror').css('background-color', '#515151');
				$('.CodeMirror-gutters').css('background-color', '#5a5a5a');
				editor.setOption('readOnly', true);
			}
			else
			{
				$('.CodeMirror').css('background-color', '#2c2827');
				$('.CodeMirror-gutters').css('background-color', '#34302f');
				editor.setOption('readOnly', false);
			}
		};

		/**
		 * Add a html content in a list element at the end of the output list
		 * @param {string} content - Html content of the list element
		 * @param {string} [style=default] - Bootstrap style of the list element (default|primary|success|info|warning|danger)
		 */
		this.addToOutput = function(content, style)
		{
			style = (style !== undefined )? style : 'default';
			if(style == 'default') {
				style = '';
			}
			else {
				style = 'list-group-item-' + style;
			}
			$('#sortie').append('<li class="list-group-item ' + style + '">' + content + '</li>');
		};

		/**
		 * Scroll to the last line of the output (smart scroll like scroll after a focus on an input) 
		 */
		this.focusOnOutput = function()
		{
			//If the element is below the screen
			if($('html, body').scrollTop() < ($('#sortie').children('li').last().offset().top + $('#sortie').children('li').last().height() - ($( window ).height() - 30))){
				$('html, body').scrollTop($('#sortie').children('li').last().offset().top + $('#sortie').children('li').last().height() - ($( window ).height() - 30));
			}
			//else if the element is above
			else if($('html, body').scrollTop() > $('#sortie').children('li').last().offset().top){
				$('html, body').scrollTop($('#sortie').children('li').last().offset().top);
			}

			//focus if there is an input
			$('#sortie').children('li').last().find('input').focus();
		};


		/**
		 * Scroll the editor to the line (smart scroll like scroll after a focus on an input)
		 * @param {int} line - The to scroll to
		 */
		this.scrollEditorCurrent = function(line)
		{
			var elementHeight = Math.round($('.CodeMirror-vscrollbar').children('div').height() / this.getLineCount());
			//If the element is below the view
			if($('.CodeMirror-vscrollbar').scrollTop() < (elementHeight*(line+1) - $('.CodeMirror').height() + 5)) {
				$('.CodeMirror-vscrollbar').scrollTop(elementHeight*(line+1) - $('.CodeMirror').height() + 5);
			}
			//else if the element is above
			else if($('.CodeMirror-vscrollbar').scrollTop() > elementHeight*line ) {
				$('.CodeMirror-vscrollbar').scrollTop(elementHeight*line);
			}
		};

		/**
		 * Get the content of an editor line
		 * @param {int} line - line source
		 * @return {string} - the content of the line
		 */
		this.getLine = function(line)
		{
			return editor.getLine(line);
		};

		/**
		 * Get the number of content's line of the editor
		 * @return {int} - the number of content's line of the editor
		 */
		this.getLineCount = function()
		{
			return editor.lineCount();
		};

		/**
		 * Replace the current content of the editor with a new one
		 * @param {string} content - the content
		 */
		this.setContent = function(content)
		{
			return editor.getDoc().setValue(content);
		};

		/**
		 * Get the current content of the editor
		 * @return {string} - Content of the editor
		 */
		this.getContent = function()
		{
			return editor.getDoc().getValue();
		};

		/**
		 * Add a new variable to the trace table
		 * @param {string} variable - variable name
		 */
		this.traceAddNewVar = function(variable)
		{
			var lineNbr = $('#trace').find('tbody').children('tr').length;
			$('#trace').find('tbody').children('tr').eq(lineNbr-2).before('<tr><th>' + variable + '</th></tr>');
		};

		/**
		 * add trace a new column
		 * @param {int} line - The line that will be writed on the header of the column
		**/
		this.traceAddNewColumn = function(line)
		{
			$('#trace').children('thead').children('tr').append('<th>' + (line+1) + '</th>');
			$('#trace').children('tbody').children('tr').append('<td></td>');
		};


		/**
		 * Edit the last column to set values of a var
		 * @param {int} id - the id of the var. it's basically the number of used of the traceAddNewVar function. The first registered is 0, the second 1...). If negative, it count from the end => clavier=-1 ; ecran=-2
		 * @param {string} varArray - The value of the var as a string
		 */
		this.traceSetVar = function(id, value)
		{
			if(id < 0) {
				id = id + $('#trace').find('tbody').children('tr').length;
			}

			$('#trace').find('tbody').children('tr').eq(id).children('td').last().html(value);
		};


		/**
		 * Add a marker and a background to the line
		 * @param {int} line - The line..
		 * @param {string} markerType - Can be `warning`, `danger`, `current` (current line style)
		 */
		this.addMarker = function(line, markerType)
		{
			//Remove other backgrounds
			editor.removeLineClass(line, 'background', 'bg-warning');
			editor.removeLineClass(line, 'background', 'bg-danger');
			editor.removeLineClass(line, 'background', 'bg-current');

			//Set error background and add marker
			editor.addLineClass(line, 'background', 'bg-' + markerType);
			var marker = document.createElement('div');
			marker.className += ' marker-' + markerType;
			if(markerType == 'current')
			{
				marker.innerHTML = '>';
				editor.setGutterMarker(line, 'markerColumn-current', marker);
			}
			else
			{
				marker.innerHTML = '●';
				editor.setGutterMarker(line, 'markerColumn-danger', marker);
			}
		};


		/**
		 * Remove all marker of a type
		 * @param {string} [markerType=false] - the type of marker (`warning`, `danger`, `current`) that will be removed. If false, then all marker will be removed
		 */
		this.removeMarker = function(markerType)
		{
			markerType = (markerType !== undefined )? markerType : false;
			//backgrounds
			var i;
			if(!markerType)
			{
				for (i = 0; i < this.getLineCount(); i++) {
					editor.removeLineClass(i, 'background', 'bg-warning');
					editor.removeLineClass(i, 'background', 'bg-danger');
					editor.removeLineClass(i, 'background', 'bg-current');
				}
				//marker
				editor.clearGutter('markerColumn-danger');
				editor.clearGutter('markerColumn-current');
			}
			else
			{
				for (i = 0; i < this.getLineCount(); i++) {
					editor.removeLineClass(i, 'background', 'bg-' + markerType);
				}
				//marker
				editor.clearGutter('markerColumn-' + markerType);
			}

		};


		/**
		 * Resize the editor by fitting the editor height with the text. The maximum height of the editor is (window's height - 100px), the minimum height of the editor is 300px
		 */
		this.resizeEditor = function()
		{
			//Resize to fit with the text
			var docHeight = $('.CodeMirror-sizer').height();
			if(docHeight !== 0)
			{
				if(docHeight <= 300) {
					docHeight = 300;
				}
				else if(docHeight >= $(window).height() - 100) {
					docHeight = $(window).height() - 100;
				}
				$('.CodeMirror').css('height', docHeight);
			}
		};


		/**
		 * Reset user interface
		 */
		this.reinit = function()
		{
			this.disableEditor(false);

			//init control buttons
			this.showPauseBtn(false);
			this.disableBtn('start', false);
			this.disableBtn('next', false);
			this.disableBtn('reset', false);

			//Remove all marker and backgrounds lines
			this.removeMarker();

			//set trace and output divs
			$('#sortie').html('');
			$('#trace').html('<thead><tr><th>&nbsp;</th></tr></thead><tbody><tr><th><em>Écran</em></th></tr><tr><th><em>Clavier</em></th></tr></tbody>');
		};

		/**
		 * Init user interface
		 */
		this.init = function()
		{
			//init open button that need recent browser 
			if (window.File && window.FileReader) {
				this.disableBtn('open');
			}
			else {
				$('.btn-open').tooltip({
					'html':true,
					'title': 'Votre navigateur n\'est pas compatible avec cette option. <br/>Mettez-le à jour ou utilisez en un autre !',
					'container': 'body'
				});
			}
		
			//Setup editor
			editor = CodeMirror.fromTextArea(document.getElementById('code'),
			{
				lineNumbers: true,
				styleActiveLine: true,
				matchBrackets: true,
				theme: 'nf04style',
				gutters: ['CodeMirror-linenumbers', 'markerColumn-danger', 'markerColumn-current']
			});
			this.reinit();
		};
		this.init();
		
		//events
		editor.on('change', function()
		{
			this.resizeEditor();
		});
	};
});