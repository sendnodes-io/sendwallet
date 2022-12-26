import React, { ReactElement } from "react";
import AccountsNotificationPanelNotificationItem from "./AccountsNotificationPanelNotificationItem";
import SharedButton from "../Shared/SharedButton";

export default function AccountsNotificationPanelNotifications(): ReactElement {
  return (
    <>
      <h3 className="list_title">
        Unread (3){" "}
        <SharedButton
          type="tertiary"
          size="small"
          icon="mark_read"
          iconSize="secondaryMedium"
          isDisabled
        >
          Mark all as read
        </SharedButton>
      </h3>
      <ul className="standard_width">
        {Array(3)
          .fill("")
          .map((_, index) => (
            <AccountsNotificationPanelNotificationItem key={index.toString()} />
          ))}
      </ul>
      <h3 className="list_title">
        Read (128){" "}
        <SharedButton
          type="tertiary"
          size="small"
          icon="garbage"
          iconSize="secondaryMedium"
          isDisabled
        >
          Delete all
        </SharedButton>
      </h3>
      <ul className="standard_width read_list">
        {Array(4)
          .fill("")
          .map((_, index) => (
            <AccountsNotificationPanelNotificationItem key={index.toString()} />
          ))}
      </ul>
      <style jsx>{`
        ul {
          display: flex;
          flex-direction: column;
          margin: 0 auto;
        }
        ul:first-of-type {
          border-bottom: solid var(--eerie-black-100) 1px;
        }
        .list_title {
          color: var(--spanish-gray);
          font-size: 16px;
          font-weight: 500;
          line-height: 24px;
          padding: unset;
          margin-left: 16px;
          margin-bottom: 7px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>
      <style jsx global>{`
        .read_list .icon_notification {
          background-color: var(--cod-gray-200);
        }
      `}</style>
    </>
  );
}
