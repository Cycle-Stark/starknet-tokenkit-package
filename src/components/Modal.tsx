import React, { useEffect, useRef, useState } from 'react';
import { animationGroups, IModalProps, IToken } from '../types';
import { limitChars } from '../configs/utils';
import { useTokenKitContext } from '../providers/providerUtils';
import CloseSvg from './CloseSvg';
import useDebounce from './hooks';


interface ISelectAsset {
  token: IToken
  select: any
  selectedToken: IToken | null | undefined
  userAddress?: string
}

const TokenBtn = ({ token, select, selectedToken }: ISelectAsset) => {

  const [renderInitials, setRenderInitials] = useState(false)

  const selectToken = () => {
    select({ ...token })
  }

  const imageloadOnError = () => {
    setRenderInitials(true)
  }

  return (
    <div className="token-btn" onClick={selectToken} style={{
      pointerEvents: token.address === selectedToken?.address ? "none" : "all",
      background: token?.address === selectedToken?.address ? "var(--tokenkit-header-footer-bg)" : "transparent"
    } as React.CSSProperties}>
      <div className="logo-holder">
        {
          renderInitials ? (
            <p style={{ textTransform: "uppercase", fontSize: "16px" }}>{limitChars(token?.symbol, 2, false)}</p>
          ) : (
            <img src={token.icon ?? "https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/256/Tether-USDT-icon.png"} onError={imageloadOnError} alt="" className="logo" />
          )
        }
      </div>
      <p>{token?.symbol}</p>
    </div>
  )
}


const TokenListItem = ({ token, select, selectedToken }: ISelectAsset) => {

  const [renderInitials, setRenderInitials] = useState(false)

  const selectToken = () => {
    select({ ...token })
  }

  const imageloadOnError = () => {
    setRenderInitials(true)
  }

  const getImageUrl = () => {
    if (token?.verified && token?.common) {
      return {
        badge: "https://i.postimg.cc/Qx8RZ8qD/verified.png",
        msg: 'Common & Verified'
      }
    }
    else if (token?.verified && !token?.common) {
      return {
        badge: "https://i.postimg.cc/d3BpZpwg/casual-life-3d-check-mark-side-view-pink.png",
        msg: 'Verified'
      }
    }
    return null
  }

  return (
    <div className="token-list-item" onClick={selectToken} style={{
      pointerEvents: token.address === selectedToken?.address ? "none" : "all",
      background: token?.address === selectedToken?.address ? "var(--tokenkit-header-footer-bg)" : "transparent"
    } as React.CSSProperties}>
      <div className="logo-holder">
        {
          renderInitials ? (
            <p style={{ textTransform: "uppercase", fontSize: "16px" }}>{limitChars(token?.symbol, 2, false)}</p>
          ) : (
            <img src={token.icon ?? "https://icons.iconarchive.com/icons/cjdowner/cryptocurrency-flat/256/Tether-USDT-icon.png"} onError={imageloadOnError} alt="" className="logo" />
          )
        }
      </div>
      <div className='token-content'>
        <div className="symbol-holder">
          <p className='symbol'>{token?.symbol}</p>
          {
            getImageUrl() ?
              <img src={getImageUrl()?.badge} height={'14px'} title={getImageUrl()?.msg} width="14px" />
              : null
          }
        </div>
        <p className='name'>{token?.name}</p>
      </div>
    </div>
  )
}

export const SelectTokenContainer = (props: IModalProps & { custsomClasses?: string, closeModal?: any }) => {
  const { selectedToken, callBackFunc, closeModal } = props

  const { network, mainnetAPIKey, sepoliaAPIKey } = useTokenKitContext()

  const [searchedToken, setSearchedToken] = useState<string>("")
  const debouncedValue = useDebounce<string>(searchedToken, 2000);
  const [commonTokens, setCommongTokens] = useState<IToken[]>([])
  const [allTokens, setAllTokens] = useState<IToken[]>([])

  const getNetwork = () => {
    if (network === 'SN_MAIN') {
      return "Mainnet"
    }
    else if (network === 'SN_SEPOLIA') {
      return "Sepolia"
    }
    return "[NO NETWORK]"
  }

  const getApiKey = () => {
    if (network === 'SN_MAIN') {
      return mainnetAPIKey
    }
    else if (network === 'SN_SEPOLIA') {
      return sepoliaAPIKey
    }
    return null
  }

  const selectToken = (token: IToken) => {
    callBackFunc && callBackFunc(token)
    closeModal && closeModal()
  }

  const loadTokens = async (common: boolean) => {
    const apiKey = getApiKey()
    if (!network) {
      throw new Error("Network not set. Set it at the tokenkit wrapper to either 'SN_MAIN' or 'SN_SEPOLIA' ");
    }
    if (!apiKey) {
      throw new Error("API Keys not set, set for both mainnet and sepolia ");
    }

    let endpoint = 'https://sepolia.apiv2.tokenkithq.io'
    let fields = "address, symbol, name, decimals, common, verified, icon"

    if (network === 'SN_MAIN') {
      endpoint = `https://mainnet.apiv2.tokenkithq.io`
    }

    let url = `${endpoint}/api/tokens?limit=100&fields=${fields}&search=${debouncedValue}`;

    if (common) {
      url = `${endpoint}/api/tokens?limit=100&fields=${fields}&common=true`;
    }

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load tokens: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      if (common) {
        setCommongTokens(data.results)
      } else {
        setAllTokens(data.results)
      }

    } catch (error: any) {
      console.error('Error loading tokens:', error?.message || error);
    }

  }

  useEffect(() => {
    loadTokens(true)
    loadTokens(false)
  }, [network, debouncedValue])

  return (
    <div className='tokenkit-wrapper'>
      <div className={`select-container`}>
        <div className="custom-modal-content"
          style={{ height: `${props?.modalHeight}` }}
          onClick={(e) => e.stopPropagation()}>
          <div className="custom-modal-header">
            <h4 className="custom-modal-title">Select Token</h4>
            <div className="right">
              <span className="chain-id">
                {getNetwork()}
              </span>
              <button className="close" onClick={props.closeModal} type='button'>
                <CloseSvg />
              </button>
            </div>
          </div>
          <div className="custom-modal-body">
            <div className="search-common-box">
              <div className="custom-search">
                <input type="text" placeholder='Search by Name, Symbol or Address' className="custom-search-input" value={searchedToken} onChange={e => setSearchedToken(e.target.value)} />
              </div>
              <div className="common-tokens">
                <h5>Common Tokens</h5>
                <div className="common-tokens-list">
                  {
                    commonTokens?.length === 0 ? (
                      <p className='no-tokens'>Common Token(s) Not Found! <a href='https://tokenkit-gamma.vercel.app/'>List here.</a></p>
                    ) : null
                  }
                  {commonTokens?.map((token: IToken, i: any) => (
                    <TokenBtn select={selectToken} key={`token_${i}`} token={token} selectedToken={selectedToken} />
                  ))}
                </div>
              </div>
            </div>
            <div className="rest-of-tokens">
              {
                allTokens?.length === 0 ? (
                  <div className="tokens-not-found-holder">
                    <p className='no-tokens'>Token(s) Not Found! <a href='https://tokenkit-gamma.vercel.app/'>List here.</a></p>
                  </div>
                ) : null
              }
              {
                allTokens?.map((token: any, i: number) => (
                  <TokenListItem key={`jtoken_item_${i}`} token={token} select={selectToken} selectedToken={selectedToken} />
                ))
              }
            </div>
          </div>
          <div className="custom-modal-footer">
            <div className="top">
              <a href='https://tokenkit-gamma.vercel.app/list-token'>List New Token</a>
            </div>
            <div className="bottom">
              <p>
                Want to try Starknet Tokenkit?
                <a href='https://tokenkit-gamma.vercel.app'>Check it out!</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SelectTokenModal = (props: IModalProps) => {
  const { children, } = props
  const [currentAnimation, setCurrentAnimation] = useState(animationGroups[props.animation ?? 'fade']);

  const modalRef = useRef<HTMLDialogElement>(null)
  const openTokensModal = () => {
    if (modalRef.current) {
      modalRef.current.showModal();
      modalRef.current.classList.remove(currentAnimation.out);
      modalRef.current.classList.add(currentAnimation.in);
    }
  }

  const closeTokensModal = () => {
    if (modalRef.current) {
      modalRef.current.classList.remove(currentAnimation.in);
      modalRef.current.classList.add(currentAnimation.out);
      setTimeout(() => {
        modalRef.current?.close();
      }, 100);
    }
  }

  return (
    <>
      <div className='tokenkit-wrapper'>
        <dialog ref={modalRef} className={`tokenkit-dialog ${currentAnimation.in}`}>
          <SelectTokenContainer {...props} closeModal={closeTokensModal} />
        </dialog>
        <div onClick={openTokensModal}>
          {children}
        </div>
      </div>
    </>
  );
};

export default SelectTokenModal;
