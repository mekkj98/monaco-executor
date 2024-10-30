import React, { useEffect, useRef, useState } from "react";

const SafeCodeExecutorIframe = React.forwardRef<HTMLIFrameElement>(
  (props, ref) => {
    return (
      <div>
        <iframe
          ref={ref}
          sandbox="allow-scripts"
          src="./executor.html"
          style={{
            width: "0px",
            height: "0px",
            border: "0px",
            visibility: "hidden",
          }}
        ></iframe>
      </div>
    );
  },
);

export default SafeCodeExecutorIframe;
