'use strict';
/* global $:false, UI:false, NF04:false */

$(function () {

	//Init User interface and interpreter
	var ui = new UI();
	var nf04 = new NF04(ui);


	//events
	$('.algo-control').on('click','.btn-start', function(){
		nf04.start();
		return false;
	});
	$('.algo-control').on('click','.btn-pause', function(){
		nf04.pause();
		return false;
	});

	$('.algo-control').on('click','.btn-next', function(){
		nf04.next();
		return false;
	});
	$('.algo-control').on('click','.btn-stop', function(){
		nf04.reset();
		return false;
	});


	$('.control-bar').on('click','.btn-open', function(){
		if($(this).parent().hasClass('disabled'))
		{
			return false;
		}
		return true;
	});


	$('#openModal').on('change','#openFile', function(){
		$('[rel=tooltip]').tooltip('hide');
		$('.tooltip').css('display', 'none');
	});

	$('#openModal').on('click','.btn-submit-open', function(){

		//Check if there is a file
		if($('#openModal').find('#openFile')[0].files.length === 0)
		{
			$('#openModal').find('.btn-submit-open').tooltip('destroy');
			$('#openModal').find('.btn-submit-open').tooltip({
				'html':true,
				'title':'Vous devez sélectionner un fichier',
				'container': '#openModal',
				'trigger': 'manual'
			});
			$('#openModal').find('.btn-submit-open').tooltip('show');
			return false;
		}

		//Check file size
		if($('#openModal').find('#openFile')[0].files[0].size >= 100000)
		{
			$('#openModal').find('.btn-submit-open').tooltip('destroy');
			$('#openModal').find('.btn-submit-open').tooltip({
				'html':true,
				'title':'Votre fichier est trop gros',
				'container': '#openModal',
				'trigger': 'manual'
			});
			$('#openModal').find('.btn-submit-open').tooltip('show');
			return false;
		}

		//Load file
		var reader = new FileReader();
		reader.onload = function(theFile)
		{
			ui.setContent(theFile.target.result);

			//TODO improve reset
			nf04.reset();
			$('#openModal').modal('hide');
		};
		reader.readAsText($('#openModal').find('#openFile')[0].files[0], 'UTF-8');
	});


	$('.control-bar').on('click','.btn-speedmode', function(){
		if(nf04.speedMode)
		{
			nf04.speedMode = false;
			$('.btn-speedmode').children('span').addClass('glyphicon-unchecked');
			$('.btn-speedmode').children('span').removeClass('glyphicon-check');
			$('.btn-speedmode').parent().parent().parent().children('.dropdown-toggle').dropdown('toggle');
			return false;
		}
		return true;
	});

	$('#speedmodeModal').on('click','.btn-submit-speedmode', function(){
		$('#speedmodeModal').modal('hide');
		nf04.reset();
		nf04.speedMode = true;
		$('.btn-speedmode').children('span').addClass('glyphicon-check');
		$('.btn-speedmode').children('span').removeClass('glyphicon-unchecked');
	});

	$('#bugModal').on('click','.btn-submit-bug', function(){
		window.open('https://github.com/ALabate/nf04/issues/new?body=Un%20probl%C3%A8me%20a%20%C3%A9t%C3%A9%20trouv%C3%A9.%0A%3C!--%20Merci%20de%20pr%C3%A9ciser%20!%20--%3E%0A%0ACode%20source%20ayant%20cr%C3%A9%C3%A9%20le%20bug%20:%0A%60%60%60%0A'+ encodeURIComponent(ui.getContent()) + '%0A%60%60%60%0A');
	});

	$('.control-bar').on('click','.btn-save', function(){
		var link = document.createElement('a');
	    link.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(ui.getContent()));
	    link.setAttribute('download', 'algo.nf04');
	    document.body.appendChild(link);
	    link.click();
	    link.remove();
	});


	$('#sortie').on('click','.btn-submit', function(){
		nf04.submit();
	});

	$('#sortie').on('keypress','.input-submit', function(event){
		if(event.which == 13)
		{
			nf04.submit();
		}
	});



	//Open filename parameter in url
	var params = getPageParameters();
	if(params !== undefined && params.filename !== undefined && params.filename.indexOf('/') == -1)
	{
		$.ajax({
			url:         './algos/' + params.filename + '.nf04',
			type:        'GET',
			dataType:    'text',
			cache:       false,
			success:     function(data){ui.setContent(data);}
		});
	}

});