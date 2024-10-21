import React, { CSSProperties, useEffect, useRef, useState } from 'react';
import { animationGroups, IModalProps, IToken } from '../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../configs/db';
import { limitChars, removeTrailingZeros } from '../configs/utils';
import { useTokenKitContext } from '../providers/providerUtils';
import CloseSvg from './CloseSvg';


interface ISelectAsset {
  token: IToken
  select: any
  selectedToken?: IToken
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
  const { selectedToken, callBackFunc } = props
  const { loadingTokens, network } = useTokenKitContext()

  const [totalTokens, setTotalTokens] = useState(0)
  const [tokens, setTokens] = useState<IToken[]>([])
  const [commonTokens, setCommonTokens] = useState<IToken[]>([])

  const [searchedToken, setSearchedToken] = useState('');
  const [page, setPage] = useState(1)

  const have_tokens_changed = useLiveQuery(() => db.tokens.toArray())
  const tokensPerPage = 50

  const selectSingle = (token: IToken) => {
    callBackFunc && callBackFunc(token)
    props.closeModal && props.closeModal()
  }

  const loadCommonTokens = async () => {
    setCommonTokens([])
    if (network === "SN_SEPOLIA") {
      const common_tks = await db.tokens.filter((t: IToken) => (t.common ?? false) && (t.public ?? false)).toArray()
      setCommonTokens(common_tks)
    }
    else if (network === "SN_MAIN") {
      const common_tks = await db.mainnet_tokens.filter((t: IToken) => (t.common ?? false) && (t.public ?? false)).toArray()
      setCommonTokens(common_tks)
    }
  }

  const sortTokens = (tokens_to_sort: any[]) => {

    const _tokens: any = tokens_to_sort;
    return _tokens?.sort((a: IToken, b: IToken) => {
      const aScore = (a.verified ? 4 : 0) + (a.common ? 2 : 0) + (a.public ? 1 : 0);
      const bScore = (b.verified ? 4 : 0) + (b.common ? 2 : 0) + (b.public ? 1 : 0);

      // Higher score comes first
      return bScore - aScore;
    }) ?? [];
  };

  const loadTokensFromDB = async () => {
    setTokens([])
    const _totalTokens = await db.tokens.count()
    setTotalTokens(_totalTokens)
    const limit = tokensPerPage;
    const offset = (page - 1) * tokensPerPage;
    const trimmedSearchedToken = searchedToken.trim()
    const regex = new RegExp(`(${trimmedSearchedToken})`, 'gi');

    const addressSearchTerm = removeTrailingZeros(trimmedSearchedToken)
    const addressRegex = new RegExp(`(${addressSearchTerm})`, 'gi');

    if (network === "SN_SEPOLIA") {
      const filteredTokens = await db.tokens
        .filter((token: IToken) => {
          const matched =
            token.symbol.match(regex) || token.name.match(regex) || removeTrailingZeros(token.address).match(addressRegex);
          return matched ? true : false;
        })
        .filter((token: IToken) => !!token.public)
        .limit(limit)
        .offset(offset)
        .toArray();
      const sortedTokens = sortTokens(filteredTokens)

      setTokens(sortedTokens);
    }
    else if (network === "SN_MAIN") {
      const filteredTokens = await db.mainnet_tokens
        .filter((token: IToken) => {
          const matched =
            token.symbol.match(regex) || token.name.match(regex) || removeTrailingZeros(token.address).match(addressRegex);
          return matched ? true : false;
        })
        .filter((token: IToken) => !!token.public)
        .limit(limit)
        .offset(offset)
        .toArray();
      const sortedTokens = sortTokens(filteredTokens)
      setTokens(sortedTokens);
    }
  }

  const getNetwork = () => {
    if (network === 'SN_MAIN') {
      return "Mainnet"
    }
    if (network === 'SN_SEPOLIA') {
      return "Sepolia"
    }
  }


  useEffect(() => {
    loadCommonTokens()
  }, [network])

  useEffect(() => {
    loadTokensFromDB()
  }, [searchedToken, page, loadingTokens, have_tokens_changed, network])

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
                    <TokenBtn select={selectSingle} key={`token_${i}`} token={token} selectedToken={selectedToken} />
                  ))}
                </div>
              </div>
            </div>
            <div className="rest-of-tokens">
              {
                tokens?.length === 0 ? (
                  <div className="tokens-not-found-holder">
                    <p className='no-tokens'>Token(s) Not Found! <a href='https://tokenkit-gamma.vercel.app/'>List here.</a></p>
                  </div>
                ) : null
              }
              {
                tokens?.map((token: any, i: number) => (
                  <TokenListItem key={`jtoken_item_${i}`} token={token} select={selectSingle} selectedToken={selectedToken} />
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
