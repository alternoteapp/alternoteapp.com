$(function () {
	var s,
		modalSuper,
		subscribeModal,
		downloadModal,
		subscribeIOSModal,
		$form = $('.subscribe-form'),
		spinnerOpts = {
			lines: 11,
			length: 3,
			width: 2,
			radius: 4,
			corners: 1,
			color: '#fff',
			speed: 1,
			hwaccel: true,
			className: 'spinner', // The CSS class to assign to the spinner
			top: '50%', // Top position relative to parent
			left: '50%' // Left position relative to parent
		};

	if ( ! window.mobile) {
		s = skrollr.init({forceHeight: false});
	}

	modalSuper = {
		render: function () {
			var html = _.template(this.template),
				$body = $('body');

			$body
				.addClass('modal-visible')
				.append(html);

			setTimeout(_.bind(function () {
				$body
					.bind('click.modal', _.bind(this.bodyClick, this))
					.bind('keyup.modal', _.bind(this.bodyKeyup, this));
			}, this), 50);

			return this;
		},

		close: function () {
			$('body')
				.unbind('click.modal')
				.unbind('keyup.modal')
				.removeClass('modal-visible');

			$('.modal-bg').addClass('hide');
			$('.modal').addClass('hide');

			setTimeout(function () {
				$('.modal').remove();
				$('.modal-bg').remove();

			}, 500);

			return this;
		},

		bodyClick: function (e) {
			if ( ! $(e.target).closest('.modal').length) {
				this.close();
			}
		},

		bodyKeyup: function (e) {
			if (e.keyCode === 27) {
				this.close();
			}
		}
	};

	subscribeModal = _.extend({}, modalSuper, {
		template: '<div class="modal-bg"></div><div class="modal"></div>',

		setContent: function (content) {
			$('.modal')
				.html(content)
				.css('display', 'block')
				.find('input')
				.bind('click', function (e) { $(this).get(0).select(); })
				.get(0).select();

			return this;
		}
	});

	subscribeIOSModal = _.extend({}, modalSuper, {
		template: '<div class="modal-bg"></div><div class="modal"></div>',

		setContent: function (content) {
			$('.modal')
				.html(content)
				.css('display', 'block')
				.find('input')
				.focus();

			return this;
		}
	});

	downloadModal = _.extend({}, modalSuper, {
		template: '<div class="modal-bg"></div><div class="modal"></div>',

		setContent: function (content) {
			$('.modal')
				.html(content)
				.css('display', 'block');

			return this;
		},

		emailKeydown: function (e) {
			if (e.keyCode === 13) {
				this.validateEmail();
			}
		},

		validateEmail: function () {
			var $email = $('.modal input.email'),
				$button = $('.modal button.submit'),
				optOut = $('.modal input.opt-out').is(':checked'),
				email = $email.val(),
				spinner;

			if ( ! validateEmail(email)) {
				$email.addClass('error').focus();

			} else {
				$button.addClass('disabled').html('<div class="spinner-w"></div>');
				spinner = new Spinner(spinnerOpts).spin($button.find('.spinner-w').get(0));
				$email.removeClass('error').attr('disabled', 'disabled');

				this.submitEmail(email, optOut);
			}
		},

		submitEmail: function (email, optOut) {
			var self = this;

			$.post('/sendlink', { email: email, optOut: optOut }, function (answer) {

				if (answer && answer.error === 0) {
					self.setContent($('#download-share-template').html());

					dataLayer.push({event: 'virtualPageView', virtualURL: '/download/thank-you'});

				} else {
					Rollbar.error('Error while submitEmail');
					alert('Oops! We’re sorry, something bad just happened. Please, try again.');
				}

			}).fail(function () {
				Rollbar.error('Error while submitEmail');
				alert('Oops! We’re sorry, something bad just happened. Please, try again.');
			})
		},

		socialEventFinishedHandler: function () {
			$('.modal').html($('#download-email-template').html());

			setTimeout(_.bind(function () {
				var email = getCookie('email');

				$('.modal').find('input.email')
					.val(email).focus()
					.bind('keydown', _.bind(this.emailKeydown, this)).end()
					.find('button.submit')
					.bind('click', _.bind(this.validateEmail, this));

			}, this), 50);

			dataLayer.push({event: 'virtualPageView', virtualURL: '/download/email'});
		}
	});


	$('.download-beta').bind('click', function () {
		downloadModal.render();
		downloadModal.socialEventFinishedHandler();
	});

	$('body').delegate('.share.callback .facebook', 'click', function (e) {
		FB.ui({
			method: 'share',
			href: 'http://alternoteapp.com'

		}, function(response) {});

		e.preventDefault();
	});

	$('.download-mas a').bind('click', function () {
		dataLayer.push({
			event: 'Fire',
			eventCategory: 'conversions',
			eventAction: 'macappstore',
			eventLabel: ''
		});
	});

	function submitSubscribeForm (e) {
		var $email = $(this).find('.email'),
			email = $email.val(),
			$button = $(this).find('.submit'),
			spinner, startText,
			formLocation = $(this).hasClass('top-subscribe-form') ? 'top' : 'bottom';

		if ( ! $button.hasClass('disabled')) {

			if( ! validateEmail(email)) {
				$email.addClass('error').focus();

				dataLayer.push({
					event: 'Fire',
					eventCategory: 'errors',
					eventAction: 'invalidEmail',
					eventLabel: formLocation
				});

			} else {
				startText = $button.html();

				$button.addClass('disabled').html('<div class="spinner-w"></div>');
				spinner = new Spinner(spinnerOpts).spin($button.find('.spinner-w').get(0));
				$email.removeClass('error').attr('disabled', 'disabled');

				dataLayer.push({
					event: 'Fire',
					eventCategory: 'interactions',
					eventAction: 'submitSubscribe',
					eventLabel: formLocation
				});

				$.post('/subscribe', { email: email }, function (answer) {
					$button.removeClass('disabled').html(startText);
					$email.removeAttr('disabled').val('');

					subscribeModal.render().setContent(answer);

					dataLayer.push({
						event: 'Fire',
						eventCategory: 'conversions',
						eventAction: 'subscribe',
						eventLabel: formLocation
					});

					setTimeout(function () {
						$('button.twitter').bind('click', function() {
							dataLayer.push({
								event: 'Fire',
								eventCategory: 'shares',
								eventAction: 'twitter'
							});
						});

						$('button.facebook').bind('click', function() {
							dataLayer.push({
								event: 'Fire',
								eventCategory: 'shares',
								eventAction: 'facebook'
							});
						});
					}, 50);

				}).fail(function () {
					dataLayer.push({
						event: 'Fire',
						eventCategory: 'errors',
						eventAction: 'subscribeServerError',
						eventLabel: ''
					});

					$button.removeClass('disabled').html(startText);
					$email.removeAttr('disabled').val('');

					alert('Oops! We’re sorry, something bad just happened. Please, try again.');
				})
			}
		}

		e.preventDefault();
	}

	$form.bind('submit', submitSubscribeForm);

	$('.get-mas, .get-paddle').bind('click', function () {
		setTimeout(function () {

			subscribeIOSModal.render().setContent($('#subscribe-ios-template').html());
			$('.modal-subscribe form').bind('submit', submitSubscribeForm);

		}, 300);
	});

	var image = new Image();
	image.src = '/assets/i/alternote-ios-teaser.png';


	var $downloadLinkForm = $('.email-download-link-form');

	$downloadLinkForm.bind('submit', function (e) {
		var $email = $(this).find('.email'),
			email = $email.val(),
			$button = $(this).find('.submit'),
			spinner, startText;

		if ( ! $button.hasClass('disabled')) {

			if( ! validateEmail(email)) {
				$email.addClass('error').focus();

			} else {
				startText = $button.html();

				$button.addClass('disabled').html('<div class="spinner-w"></div>');
				spinner = new Spinner(spinnerOpts).spin($button.find('.spinner-w').get(0));
				$email.removeClass('error').attr('disabled', 'disabled');

				$.post('/sendlink', { email: email }, function (answer) {
					alert('Done, thanks! Check your inbox');

					$button.removeClass('disabled').html(startText);
					$email.removeAttr('disabled').val('');

				}).fail(function () {
					$button.removeClass('disabled').html(startText);
					$email.removeAttr('disabled').val('');

					alert('Oops! We’re sorry, something bad just happened. Please, try again.');
				})
			}
		}

		e.preventDefault();
	});

	function validateEmail(email) {
		var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
		return re.test(email);
	}

	function getCookie(name) {
		var cookie = " " + document.cookie;
		var search = " " + name + "=";
		var setStr = null;
		var offset = 0;
		var end = 0;
		if (cookie.length > 0) {
			offset = cookie.indexOf(search);
			if (offset != -1) {
				offset += search.length;
				end = cookie.indexOf(";", offset)
				if (end == -1) {
					end = cookie.length;
				}
				setStr = unescape(cookie.substring(offset, end));
			}
		}
		return(setStr);
	}
});