"use strict";

const Notification = global.NotificationClass;
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

class mailNotifier extends Notification {
  constructor(notification) {
    super(notification);
  }

  send(notification) {
    var _this = this;
    var endOptions = {};
    notification.to = (notification.to)?notification.to.toString():"";
    notification.cc = (notification.cc)?notification.cc.toString():"";
    notification.bcc = (notification.bcc)?notification.bcc.toString():"";

    function readFilePromise(type, file) {
      return new Promise(function (resolve, reject) {
        fs.readFile(file, function (err, data) {
          let res = {};
          if (err) {
            res[type] = err;
            reject(res);
          } else {
            res[type] = data;
            resolve(res);
          }
        });
      });
    }

    let transport = nodemailer.createTransport(notification.transport);
    let filesReads = [];

    let templateDir = path.resolve(notification.templateDir, notification.template);
    let htmlTemplate = path.resolve(templateDir, "html.html");
    let txtTemplate = path.resolve(templateDir, "text.txt");

    filesReads.push(readFilePromise("html", htmlTemplate));
    filesReads.push(readFilePromise("text", txtTemplate));

    Promise.all(filesReads)
      .then(function (res) {

        let html_data;
        let text_data;

        if (res[0].hasOwnProperty("html")) {
          [html_data, text_data] = [res[0].html.toString(), res[1].text.toString()];
        } else {
          [html_data, text_data] = [res[1].html.toString(), res[0].text.toString()];
        }

        let textData = [];
        textData.push(_this.replaceWith(html_data, notification));
        textData.push(_this.replaceWith(text_data, notification));

        Promise.all(textData)
          .then(function (res) {
            let [html, text] = res;
            let mailOptions = {
              from: notification.from,
              to: notification.to,
              cc: notification.cc,
              bcc: notification.bcc,
              subject: notification.subject,
              text: text,
              html: html,
              attachments: notification.attachments
            };

            if (notification.disable) {
              _this.logger("warn", "Mail sender is disable.");
              endOptions.messageLog = "Mail sender is disable.";
              _this.end(endOptions);

            } else {
              transport.sendMail(mailOptions,
                function (err, res) {
                  if (err) {
                    endOptions.messageLog = "Mail sender:" + JSON.stringify(err);
                    _this.end(endOptions);
                  } else {
                    _this.end();
                  }
                });
            }
          })
          .catch(function (err) {
            endOptions.end = "error";
            endOptions.messageLog = "Mail sender:" + JSON.stringify(err);
            _this.end(endOptions);
          });

      })
      .catch(function (err) {
        endOptions.end = "error";
        endOptions.messageLog = "Mail sender:" + JSON.stringify(err);
        _this.end(endOptions);
      });

  }

}

module.exports = mailNotifier;