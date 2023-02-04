import React from "react";

const SignDataInfo: React.FC<{
  label: string;
  content: string;
}> = ({ label, content }) => {
  return (
    <>
      <div className="wrapper">
        <div className="label">{label}:</div>
        <div className="content">{content}</div>
      </div>
      <style jsx>{`
        .wrapper {
          display: flex;
          justify-content: space-between;
          width: 100%;
          font-size: 16px;
          line-height: 24px;
        }
        .wrapper .label {
          font-size: 16px;
        }
        .content {
          color: var(--spanish-gray);
        }
      `}</style>
    </>
  );
};

export default SignDataInfo;
