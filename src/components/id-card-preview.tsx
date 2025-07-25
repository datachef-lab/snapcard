import React, { forwardRef } from 'react'

const IdCardPreview = forwardRef<HTMLDivElement, React.PropsWithChildren<unknown>>(function IdCardPreview(props, ref) {
  return (
    <div
      ref={ref}
      className="id-card-print"
      style={{
        width: '8.6cm',
        height: '2.5cm',
        // Add any additional styles needed for the card
        position: 'relative',
        background: '#fff',
        overflow: 'hidden',
      }}
    >
      {props.children ? props.children : 'id-card-preview'}
    </div>
  )
})

export default IdCardPreview
