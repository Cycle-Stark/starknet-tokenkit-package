interface SearchSvgProps {
  color?: string; // Optional color prop
}

const SearchSvg = ({ color = 'currentColor' }: SearchSvgProps) => {
  return (
    <svg
      className="search-svg"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C12.1217 18 14.0666 17.1571 15.5 15.75L20.7071 20.9571C21.0976 21.3476 21.7308 21.3476 22.1213 20.9571C22.5118 20.5666 22.5118 19.9334 22.1213 19.5429L16.9142 14.3358C18.1531 12.8847 19 10.9853 19 9C19 5.13401 15.866 2 12 2C10.3431 2 8.68629 2 7.02944 2C5.37259 2 3.71573 2 2.05888 2C2.03922 2 2.01956 2 2 2H10ZM10 4C6.68629 4 4 6.68629 4 10C4 13.3137 6.68629 16 10 16C13.3137 16 16 13.3137 16 10C16 6.68629 13.3137 4 10 4Z"
        fill={color} // Apply the color prop to the fill attribute
      />
    </svg>
  );
};

export default SearchSvg;