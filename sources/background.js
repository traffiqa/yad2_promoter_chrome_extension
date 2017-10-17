
var urls = {
    personalArea: "https://my.yad2.co.il/newOrder/index.php?action=personalAreaIndex"
}

function onErrorPersonalArea(jqXHR, textStatus, errorThrown) {
    console.error("Error while getting personal area. Error:", errorThrown);
    var opaqueRed = [255, 0, 0, 255];
    chrome.browserAction.setBadgeBackgroundColor({color: opaqueRed});
    chrome.browserAction.setBadgeText({text: "!"});
}

function onSuccessfulPersonalArea(data, textStatus, jqXHR) {
    console.info("Successfully got personal area.")
    // Select all div's with class "content-wrapper active"
    var numberOfPromotableAds = 0;
    var ajaxCalls = [];
    $("div[class='content-wrapper active']", data).each(function(index, element) {
        var subCategoryUrl = $(element).parent().attr("href");
        var ajaxCall = $.ajax(subCategoryUrl, {
            method: "GET",
            dataType: "html",
            success: function(data, textStatus, jqXHR) {
                var ordersTable = $("#feed", data);
                $("tr", ordersTable).each(function(index, element) {
                    if ($(element).hasClass("item")) {
                        var tableRowLength = ('td', element).length;
                        if (tableRowLength < 7) {
                            console.error("Expected at least 7 columns in row. Instead have:", tableRowLength);
                        }
                        else {
                            var itemDate = $("td:nth-child(7)", element).text();
                            var itemTime = $("td:nth-child(6)", element).text();
                            var dateParts = itemDate.split('/');
                            var timeParts = itemTime.split(':');
                            if (dateParts.length !== 3) {
                                console.error("Error while trying to parse date:", itemDate);
                            }
                            else if (timeParts.length !== 2) {
                                console.error("Error while trying to parse time:", itemTime);
                            }
                            else {
                                var itemDateObj = new Date(dateParts[2], dateParts[1]-1, dateParts[0], timeParts[0], timeParts[1]);
                                var itemMoment = moment.tz(itemDateObj, "Asia/Jerusalem");
                                var currentDateObj = new Date();
                                var currentMoment = moment();
                                var duration = moment.duration(currentMoment.diff(itemMoment));
                                if (duration.asHours() >= 4) {
                                    numberOfPromotableAds += 1;
                                }
                            }
                        }
                    }
                });
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error("Unable to get orders from", subCategoryUrl, "Error:", errorThrown);
            }
        });
        ajaxCalls.push(ajaxCall);
    });

    $.when.apply($, ajaxCalls).then(function () {
        console.info("Done checking all ads. Found", numberOfPromotableAds, "of ads to promote");
        var badgeText = "\u2713";
        if (numberOfPromotableAds > 0) {
            badgeText = numberOfPromotableAds.toString();
        }
        chrome.browserAction.setBadgeText({text: badgeText});
    });
}

function getBounceEligibleAds() {
    console.info("Getting all ads...")
    $.ajax(urls.personalArea, {
        method: "GET",
        success: onSuccessfulPersonalArea,
        error: onErrorPersonalArea
    });
}

$(function() {
    // Run once, then every interval
    getBounceEligibleAds();
    var oneHourInterval = 60 * 60 * 1000;
    setInterval(getBounceEligibleAds, oneHourInterval);
});
