import css from 'styled-jsx/css'

export default css.global`
.icon_close {
  mask-image: url("./images/close.svg");
  mask-size: cover;
  position: absolute;
  right: 2em;
  top: 1.2em;
  width: 0.75rem;
  height: 0.75rem;
  background-color: var(--spanish-gray);
}
.icon_close:hover {
  background-color: var(--white);
}

.dashed_border {
  margin: var(--main-margin);
  padding: var(--main-padding);
  background-size: contain;
  background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23515151FF' stroke-width='4' stroke-dasharray='4%2c 10' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
  border-radius: 16px;
}

.dashed_border_thin {
  margin: var(--main-margin);
  padding: var(--main-padding);
  background-size: contain;
  background-image: url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='16' ry='16' stroke='%23515151FF' stroke-width='3' stroke-dasharray='1.5%2c 7' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e");
  border-radius: 16px;
}

.detail_items_wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: scroll;
}
.detail_item {
  width: 100%;
  font-size: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 0.5rem 0.75rem;
}
.detail_item :global(span, pre) {
  color: var(--white);
}

.detail_item :global(pre) {
  white-space: break-spaces;
  margin-top: 0.5rem;
  font-size: 0.75rem;
}
.detail_item_value {
  max-width: 60%;
  max-height: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-grow: 1;
  text-align: right;
}
.flex_col {
  flex-direction: column;
}
.detail_item_row {
  width: 100%;
  white-space: pre-wrap;
  word-wrap: break-word;
}

`