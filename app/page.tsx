'use client';

import Link from 'next/link';
import styled from 'styled-components';
import Highlighter from '@/components/Highlighter';

const Page = styled.div`
  min-height: 100vh;
  background-color: #f2ede4;
  background-image: url('/bg-texture.png');
  background-repeat: repeat;
  background-size: 400px 400px;
  background-blend-mode: multiply;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6rem 8vw;
`;

const Layout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  max-width: 1200px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const Headline = styled.h1`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: clamp(2.8rem, 5vw, 4.5rem);
  font-weight: 400;
  line-height: 1.1;
  color: #1a1a18;
  letter-spacing: -0.02em;

  em {
    font-style: italic;
    display: block;
  }
`;

const Body = styled.p`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: clamp(1rem, 1.5vw, 1.2rem);
  line-height: 1.65;
  color: #3a3a36;
  max-width: 38ch;
`;

const CTARow = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
`;

const PrimaryButton = styled(Link)`
  display: inline-block;
  padding: 0.9rem 2rem;
  background: #1a1a18;
  color: #f2ede4;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover {
    background: #333330;
  }
`;

const SecondaryButton = styled(Link)`
  display: inline-block;
  padding: 0.9rem 2rem;
  background: transparent;
  color: #1a1a18;
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 1.05rem;
  letter-spacing: 0.01em;
  border: 1.5px solid #1a1a18;
  border-radius: 4px;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(26, 26, 24, 0.06);
  }
`;

const Specs = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(26, 26, 24, 0.15);
`;

const Spec = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const SpecLabel = styled.span`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #888880;
`;

const SpecValue = styled.span`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 1rem;
  color: #1a1a18;
`;

const Right = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: 768px) {
    display: none;
  }
`;

const BookPreview = styled.div`
  background: #1a1a18;
  border-radius: 6px;
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 3/4;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 32px 80px rgba(26, 26, 24, 0.2);
`;

const BookMeta = styled.div`
  font-family: var(--font-inter), system-ui, sans-serif;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(242, 237, 228, 0.4);
`;

const BookBody = styled.div`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 0.95rem;
  line-height: 1.75;
  color: rgba(242, 237, 228, 0.6);
`;


const BookTitle = styled.div`
  font-family: var(--font-playfair), Georgia, serif;
  font-size: 1.5rem;
  font-style: italic;
  color: #f2ede4;
  line-height: 1.3;
`;

export default function Home() {
  return (
    <Page>
      <Layout>
        <Left>
          <Headline>
            Introducing
            <em>Inklink.</em>
          </Headline>

          <Body>
            Inklink makes collecting reader feedback as easy as sharing a link. We track word-level reactions, retention rates, and email addresses from interested readers, 
            and show you exactly where and how your writing hits (and where it doesn't).
          </Body>

          <CTARow>
            <PrimaryButton href="/read">Start Reading</PrimaryButton>
            <SecondaryButton href="/admin">Author Dashboard</SecondaryButton>
          </CTARow>

          <Specs>
            <Spec>
              <SpecLabel>Feedback</SpecLabel>
              <SpecValue>Word-level precision</SpecValue>
            </Spec>
            <Spec>
              <SpecLabel>Versions</SpecLabel>
              <SpecValue>Git-backed history</SpecValue>
            </Spec>
            <Spec>
              <SpecLabel>Reactions</SpecLabel>
              <SpecValue>Likes & inline edits</SpecValue>
            </Spec>
            <Spec>
              <SpecLabel>Interface</SpecLabel>
              <SpecValue>Distraction-free</SpecValue>
            </Spec>
          </Specs>
        </Left>

        <Right>
          <BookPreview>
            <BookMeta>Chapter 1 — Draft</BookMeta>
            <BookBody>
              The morning light came through the curtains in{' '}
              <Highlighter color="yellow" opacity={0.28} style={{ color: 'rgba(242,237,228,0.9)' }}>thin, pale ribbons</Highlighter> — the kind that
              make dust look deliberate. She sat at the table with her coffee,
              watching the steam rise and curl and{' '}
              <Highlighter color="yellow" opacity={0.28} style={{ color: 'rgba(242,237,228,0.9)' }}>disappear into nothing</Highlighter>, which
              seemed, at the time, like a kind of answer.
            </BookBody>
            <BookTitle>
              Something<br />Worth Saying
            </BookTitle>
          </BookPreview>
        </Right>
      </Layout>
    </Page>
  );
}
